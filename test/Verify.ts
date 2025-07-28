import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { BtcWallet } from "@okxweb3/coin-bitcoin";
import { toRpcSig } from "@ethereumjs/util";

const mnemonicTest =
  "test test test test test test test test test test test junk";

describe("Verify Contract", function () {
  async function deploy() {
    const [owner, otherAccount] = await hre.viem.getWalletClients();
    const verify = await hre.viem.deployContract("Verify", []);
    const publicClient = await hre.viem.getPublicClient();

    let param = {
      mnemonic: mnemonicTest,
      hdPath: "m/86'/0'/0'/0/0",
    };
    let wallet = new BtcWallet();
    let privateKey = await wallet.getDerivedPrivateKey(param);
    const btcAccount = await wallet.getNewAddress({
      privateKey: privateKey,
      addressType: "segwit_taproot",
    });
    let publicKey = btcAccount.compressedPublicKey;
    let message = `Hello Bitcoin Test`;
    let signatureBase64 = await wallet.signMessage({
      data: {
        message: message + "0x0000000000000000000000000000000000000000",
        type: 0,
      },
      privateKey,
    });
    let signatureBuffer = Buffer.from(signatureBase64, "base64");
    let signature = toRpcSig(
      BigInt(signatureBuffer[0] - 4),
      signatureBuffer.subarray(1, 33),
      signatureBuffer.subarray(33, 65)
    );
    return {
      publicKey,
      verify,
      signature,
      message,
      owner,
      otherAccount,
      publicClient,
    };
  }

  describe("Verify", function () {
    it("Verify BTC signature", async function () {
      const { verify, publicKey, signature, message } = await loadFixture(
        deploy
      );
      console.log("🚀 ~ publicKey:", publicKey);

      // @ts-ignore
      expect(
        await verify.read.verifyMessage([
          message,
          signature as `0x${string}`,
          `0x${publicKey}`,
          "0x0000000000000000000000000000000000000000",
        ])
      ).to.equal(true);
    });
  });
});
