pragma solidity ^0.8.0;

import "./Verify.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";


interface IVerify {
    function verifyMessage(
        string memory message,
        bytes memory signature,
        bytes memory btcPubKey,
        address evmAddress
    ) external view returns (bool);
}

contract Mapping is Ownable2StepUpgradeable {
    mapping(bytes => address) public btcToEvm;
    mapping(address => bytes) public evmToBtc;
    mapping(bytes => bool) public isRegistered;
    
    IVerify public verifier;

    event AddressLinked(bytes indexed btcPubKey, address indexed evmAddress, address indexed sender);
    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);

    error AlreadyRegistered();
    error EvmAddressAlreadyLinked();
    error NotRegistered();
    error InvalidSignature();
    error Unauthorized();
    error InvalidPubKeyLength();
    error ZeroAddress();

    modifier validAddress(address addr) {
        if (addr == address(0)) revert ZeroAddress();
        _;
    }

    function initialize(address _verifierAddress) external initializer {
        if (_verifierAddress == address(0)) revert ZeroAddress();
        
        __Ownable2Step_init();
        verifier = IVerify(_verifierAddress);
    }
    
    
    function linkAddress(
        bytes memory btcPubKey,
        address evmAddress,
        string memory message,
        bytes memory signature
    ) external {
        if (btcPubKey.length != 33) revert InvalidPubKeyLength();
                
        if (isRegistered[btcPubKey]) revert AlreadyRegistered();
        if (evmToBtc[evmAddress].length != 0) revert EvmAddressAlreadyLinked();
        bool isValid = verifier.verifyMessage(message, signature, btcPubKey, evmAddress);
        if (!isValid) revert InvalidSignature();
        
        btcToEvm[btcPubKey] = evmAddress;
        evmToBtc[evmAddress] = btcPubKey;
        isRegistered[btcPubKey] = true;
        
        emit AddressLinked(btcPubKey, evmAddress, msg.sender);
    }
    
    function isEvmAddressLinked(address evmAddress) external view returns (bool) {
        return evmToBtc[evmAddress].length != 0;
    }
    
     function updateVerifier(address newVerifierAddress) external onlyOwner validAddress(newVerifierAddress) {
        address oldVerifier = address(verifier);
        verifier = IVerify(newVerifierAddress);
        emit VerifierUpdated(oldVerifier, newVerifierAddress);
    }
}