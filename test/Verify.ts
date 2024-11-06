import {loadFixture,} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import {expect} from "chai";
import hre from "hardhat";
import {BtcWallet} from "@okxweb3/coin-bitcoin";
import {toRpcSig} from "@ethereumjs/util";

const mnemonicTest = "test test test test test test test test test test test junk"
describe("Verify Contract", function () {
    async function deploy() {
        const [owner, otherAccount] = await hre.viem.getWalletClients();
        const mapping = await hre.viem.deployContract("Mapping", []);
        const publicClient = await hre.viem.getPublicClient();
        const txHash: `0x${string}` = "0x6429cc08968448526a916bf2c6a909f2b94c91c5f6cefe853b8485d14f49eadd"
        let param = {
            mnemonic: mnemonicTest,
            hdPath: "m/44'/0'/0'/0/0"
        };
        let wallet = new BtcWallet()
        let privateKey = await wallet.getDerivedPrivateKey(param);
        const btcAccount = await wallet.getNewAddress({
            privateKey: privateKey,
            addressType: "segwit_taproot",
        });
        let publicKey = btcAccount.compressedPublicKey
        let message = `Welcome to b14g! \n\nSignature using for: `
        let signatureBase64 = await wallet.signMessage({
            data: {message: `${message}${mapping.address}`, type: 0},
            privateKey
        });
        let signatureBuffer = Buffer.from(signatureBase64, "base64")
        let signature = toRpcSig(BigInt(signatureBuffer[0] - 4), signatureBuffer.subarray(1, 33), signatureBuffer.subarray(33, 65))
        return {
            publicKey,
            txHash,
            mapping,
            signature,
            message,
            owner,
            otherAccount,
            publicClient,
        };
    }

    describe("Mapping", function () {
        it("Create and get", async function () {
            const {mapping, txHash, publicKey, signature, message, owner} = await loadFixture(deploy);
            await mapping.write.setBTCPublicKey([txHash, `0x${publicKey}`]);
            // @ts-ignore
            await mapping.write.createMapping([txHash, signature, message]);
            expect(await mapping.read.pubKeyToAddress([`0x${publicKey}`])).to.eq((await owner.getAddresses())[0])
        });

    })
    describe("Verify", function () {
        it("Verify BTC signature", async function () {
            const {mapping, txHash, publicKey, signature, message} = await loadFixture(deploy);
            await mapping.write.setBTCPublicKey([txHash, `0x${publicKey}`]);
            // @ts-ignore
            expect(await mapping.read.verify([txHash, signature, message])).to.equal(true);
        });
    })
});
