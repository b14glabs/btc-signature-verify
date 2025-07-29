pragma solidity ^0.8.0;

import "./Verify.sol";

contract Mapping {
    mapping(bytes32 => address) public btcToEvm;
    mapping(address => bytes32) public evmToBtc;
    mapping(bytes32 => bool) public isRegistered;
    
    Verify public verifier;
    address public owner;

    event AddressLinked(bytes32 indexed btcPubKey, address indexed evmAddress, address indexed sender);
    event AddressUnlinked(bytes32 indexed btcPubKey, address indexed evmAddress, address indexed sender);
    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);

    error AlreadyRegistered();
    error EvmAddressAlreadyLinked();
    error NotRegistered();
    error InvalidSignature();
    error Unauthorized();
    error InvalidPubKeyLength();
    error ZeroAddress();
    error OnlyOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }
    
    modifier validAddress(address addr) {
        if (addr == address(0)) revert ZeroAddress();
        _;
    }
    
    constructor(address _verifierAddress) validAddress(_verifierAddress) {
        verifier = Verify(_verifierAddress);
        owner = msg.sender;
    }
    
    
    function linkAddress(
        bytes memory btcPubKey,
        address evmAddress,
        string memory message,
        bytes memory signature
    ) external {
        if (btcPubKey.length != 33) revert InvalidPubKeyLength();
        
        bytes32 pubKeyHash = keccak256(btcPubKey);
        
        if (isRegistered[pubKeyHash]) revert AlreadyRegistered();
        if (evmToBtc[evmAddress] != bytes32(0)) revert EvmAddressAlreadyLinked();
        bool isValid = verifier.verifyMessage(message, signature, btcPubKey, evmAddress);
        if (!isValid) revert InvalidSignature();
        
        btcToEvm[pubKeyHash] = evmAddress;
        evmToBtc[evmAddress] = pubKeyHash;
        isRegistered[pubKeyHash] = true;
        
        emit AddressLinked(pubKeyHash, evmAddress, msg.sender);
    }
    
    function unlinkAddress(bytes memory btcPubKey) external {
        bytes32 pubKeyHash = keccak256(btcPubKey);
        
        if (!isRegistered[pubKeyHash]) revert NotRegistered();
        
        address linkedEvmAddress = btcToEvm[pubKeyHash];
        
        if (msg.sender != linkedEvmAddress) revert Unauthorized();
        
        delete btcToEvm[pubKeyHash];
        delete evmToBtc[linkedEvmAddress];
        delete isRegistered[pubKeyHash];
        
        emit AddressUnlinked(pubKeyHash, linkedEvmAddress, msg.sender);
    }
    
    function getEvmAddress(bytes memory btcPubKey) external view returns (address) {
        bytes32 pubKeyHash = keccak256(btcPubKey);
        return btcToEvm[pubKeyHash];
    }
    
    function getBtcPubKeyHash(address evmAddress) external view returns (bytes32) {
        return evmToBtc[evmAddress];
    }
    
    function isAddressLinked(bytes memory btcPubKey) external view returns (bool) {
        bytes32 pubKeyHash = keccak256(btcPubKey);
        return isRegistered[pubKeyHash];
    }
    
    function isEvmAddressLinked(address evmAddress) external view returns (bool) {
        return evmToBtc[evmAddress] != bytes32(0);
    }
    
    function verifyLinking(bytes memory btcPubKey, address evmAddress) external view returns (bool) {
        bytes32 pubKeyHash = keccak256(btcPubKey);
        return btcToEvm[pubKeyHash] == evmAddress && evmToBtc[evmAddress] == pubKeyHash;
    }
    
     function updateVerifier(address newVerifierAddress) external onlyOwner validAddress(newVerifierAddress) {
        address oldVerifier = address(verifier);
        verifier = Verify(newVerifierAddress);
        emit VerifierUpdated(oldVerifier, newVerifierAddress);
    }

    function transferOwnership(address newOwner) external onlyOwner validAddress(newOwner) {
        owner = newOwner;
    }
}