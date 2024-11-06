// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./Verify.sol";

contract Mapping is Verify {
    mapping(bytes => address) public pubKeyToAddress;

    /*
    @param txHash: BTC Babylon staking transaction hash
    @param signature: btc Signature for proving that user create txHash
    @param message: message data to sign
    */
    function createMapping(bytes32 txHash, bytes memory btcSignature, string memory message) public {
        //get publicKey from Data Embed Scrip
        bytes memory btcPublicKey = getBTCPublicKey(txHash);
        require(verify(txHash, btcSignature, message), "Invalid Signature");
        pubKeyToAddress[btcPublicKey] = msg.sender;
    }
}
