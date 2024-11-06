// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./EllipticCurve.sol";
import "hardhat/console.sol";

contract Verify {
    // mock to test
    mapping(bytes32 => bytes) txHashToPublicKey;

    // mock to test
    function getBTCPublicKey(bytes32 txHash) public view returns (bytes memory){
        return txHashToPublicKey[txHash];
    }

    // mock to test
    function setBTCPublicKey(bytes32 txHash, bytes memory publicKey) public {
        txHashToPublicKey[txHash] = publicKey;
    }


    function unCompressedPubKey(bytes memory pub) public pure returns (bytes memory) {
        require(pub.length == 33, "Invalid pub length");
        uint8 prefix = uint8(bytes1(pub[0]));
        bytes32 publicKey;
        assembly {
            publicKey := mload(add(pub, 33))
        }
        return abi.encode(publicKey, bytes32(EllipticCurve.deriveY(prefix, uint256(publicKey))));
    }

    function calculateAddress(bytes memory pub) public pure returns (address addr) {
        bytes32 hash = keccak256(pub);
        assembly {
            mstore(0, hash)
            addr := mload(0)
        }
    }

    function verifyMessage(bytes memory message, bytes memory btcSignature, bytes memory btcPublicKey) public pure returns (bool){
        bytes32 btcSignedMessageHash = sha256(abi.encodePacked(sha256(abi.encodePacked("\x18Bitcoin Signed Message:\n", bytes1(uint8(message.length)), message))));
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(btcSignature, 32))
            s := mload(add(btcSignature, 64))
            v := byte(0, mload(add(btcSignature, 96)))
        }
        address addressFromSignature = ecrecover(btcSignedMessageHash, v, r, s);
        return calculateAddress(unCompressedPubKey(btcPublicKey)) == addressFromSignature;
    }

    function toString(address _address) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_address)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory buffer = new bytes(42);

        buffer[0] = '0';
        buffer[1] = 'x';

        for (uint256 i = 0; i < 20; i++) {
            buffer[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            buffer[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }

        return string(buffer);
    }
    /*
    @param txHash: BTC Babylon staking transaction hash
    @param signature: btc Signature for proving that user create txHash
    @param message: message data to sign
    @return whether user create BTC Babylon staking transaction or not
    */
    function verify(bytes32 txHash, bytes memory btcSignature, string memory message) public view returns (bool){
        //get publicKey from Data Embed Scrip
        bytes memory btcPublicKey = getBTCPublicKey(txHash);
        return verifyMessage(bytes(abi.encodePacked(message, toString(address(this)))), btcSignature, btcPublicKey);
    }

}
