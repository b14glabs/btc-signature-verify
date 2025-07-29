import { toRpcSig } from "@ethereumjs/util";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { BtcWallet } from "@okxweb3/coin-bitcoin";
import { expect } from "chai";
import hre from "hardhat";

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

describe("Mapping Contract", function () {
  async function deploy() {
    const [owner, user1, user2, user3] = await hre.viem.getWalletClients();
    const verify = await hre.viem.deployContract("Verify", []);
    const mapping = await hre.viem.deployContract("Mapping", [verify.address]);

    const publicClient = await hre.viem.getPublicClient();

    let param = {
      mnemonic: mnemonicTest,
      hdPath: "m/86'/0'/0'/0/0",
    };

    let param2 = { mnemonic: mnemonicTest, hdPath: "m/86'/0'/0'/0/1" };
    let wallet = new BtcWallet();
    let privateKey = await wallet.getDerivedPrivateKey(param);
    let privateKey2 = await wallet.getDerivedPrivateKey(param2);

    const btcAccount = await wallet.getNewAddress({
      privateKey: privateKey,
      addressType: "segwit_taproot",
    });

    const btcAccount2 = await wallet.getNewAddress({
      privateKey: privateKey2,
      addressType: "segwit_taproot",
    });

    return {
      verify,
      mapping,
      user1,
      user2,
      user3,
      owner,
      wallet,
      publicClient,
      privateKey,
      privateKey2,
      btcAccount,
      btcAccount2,
    };
  }

  async function createSignature(
    wallet: any,
    privateKey: string,
    message: string,
    evmAddress: string
  ) {
    let signatureBase64 = await wallet.signMessage({
      data: { message: message + evmAddress.toLowerCase(), type: 0 },
      privateKey,
    });

    let signatureBuffer = Buffer.from(signatureBase64, "base64");
    return toRpcSig(
      BigInt(signatureBuffer[0] - 4),
      signatureBuffer.subarray(1, 33),
      signatureBuffer.subarray(33, 65)
    );
  }

  describe("Deploy", function () {
    it("Reject zero address", async function () {
      const zeroAddress = "0x0000000000000000000000000000000000000000";

      await expect(
        hre.viem.deployContract("Mapping", [zeroAddress])
      ).to.be.rejectedWith("ZeroAddress");
    });
  });

  describe("Address Linking", function () {
    it("Successfully!", async function () {
      const { mapping, wallet, privateKey, btcAccount, user1 } =
        await loadFixture(deploy);

      const message = "Link my Bitcoin address";
      const evmAddress = user1.account.address;
      const publicKey = `0x${btcAccount.compressedPublicKey}` as `0x${string}`;

      const signature = await createSignature(
        wallet,
        privateKey,
        message,
        evmAddress
      );

      await mapping.write.linkAddress(
        [publicKey, evmAddress, message, signature as `0x${string}`],
        { account: user1.account }
      );

      expect(await mapping.read.isAddressLinked([publicKey])).to.be.true;
      expect(await mapping.read.isEvmAddressLinked([evmAddress])).to.be.true;
      expect(
        (await mapping.read.getEvmAddress([publicKey])).toLowerCase()
      ).to.equal(evmAddress.toLowerCase());
      expect(await mapping.read.verifyLinking([publicKey, evmAddress])).to.be
        .true;

      const pubKeyHash = await mapping.read.getBtcPubKeyHash([evmAddress]);
      expect(pubKeyHash).to.not.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Invalid public key length", async function () {
      const { mapping, user1 } = await loadFixture(deploy);

      const message = "Link my Bitcoin address";
      const evmAddress = user1.account.address;
      const invalidPublicKey = "0x0311223344";
      const signature =
        "0x1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789";

      await expect(
        mapping.write.linkAddress(
          [invalidPublicKey, evmAddress, message, signature],
          { account: user1.account }
        )
      ).to.be.rejectedWith("InvalidPubKeyLength");
    });

    it("Already registered BTC public key", async function () {
      const { mapping, wallet, privateKey, btcAccount, user1, user2 } =
        await loadFixture(deploy);

      const message = "Link my Bitcoin address";
      const evmAddress1 = user1.account.address;
      const evmAddress2 = user2.account.address;
      const publicKey = `0x${btcAccount.compressedPublicKey}` as `0x${string}`;

      const signature1 = await createSignature(
        wallet,
        privateKey,
        message,
        evmAddress1
      );
      const signature2 = await createSignature(
        wallet,
        privateKey,
        message,
        evmAddress2
      );

      await mapping.write.linkAddress(
        [publicKey, evmAddress1, message, signature1 as `0x${string}`],
        { account: user1.account }
      );

      await expect(
        mapping.write.linkAddress(
          [publicKey, evmAddress2, message, signature2 as `0x${string}`],
          { account: user2.account }
        )
      ).to.be.rejectedWith("AlreadyRegistered");
    });

    it("Already EVM address", async function () {
      const {
        mapping,
        wallet,
        privateKey,
        privateKey2,
        btcAccount,
        btcAccount2,
        user1,
      } = await loadFixture(deploy);

      const message = "Link my Bitcoin address";
      const evmAddress = user1.account.address;
      const publicKey1 = `0x${btcAccount.compressedPublicKey}` as `0x${string}`;
      const publicKey2 =
        `0x${btcAccount2.compressedPublicKey}` as `0x${string}`;

      const signature1 = await createSignature(
        wallet,
        privateKey,
        message,
        evmAddress
      );
      const signature2 = await createSignature(
        wallet,
        privateKey2,
        message,
        evmAddress
      );

      await mapping.write.linkAddress(
        [publicKey1, evmAddress, message, signature1 as `0x${string}`],
        { account: user1.account }
      );

      await expect(
        mapping.write.linkAddress(
          [publicKey2, evmAddress, message, signature2 as `0x${string}`],
          { account: user1.account }
        )
      ).to.be.rejectedWith("EvmAddressAlreadyLinked");
    });

    it("Invalid signature", async function () {
      const { mapping, user1, btcAccount } = await loadFixture(deploy);

      const message = "Link my Bitcoin address";
      const evmAddress = user1.account.address;
      const publicKey = `0x${btcAccount.compressedPublicKey}` as `0x${string}`;

      const invalidSignature =
        "0x1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789";

      await expect(
        mapping.write.linkAddress(
          [publicKey, evmAddress, message, invalidSignature],
          { account: user1.account }
        )
      ).to.be.rejectedWith("InvalidSignature");
    });
  });

  describe("Address Unlink", function () {
    it("Successfully", async function () {
      const { mapping, wallet, privateKey, btcAccount, user1 } =
        await loadFixture(deploy);

      const message = "Link my Bitcoin address";
      const evmAddress = user1.account.address;
      const publicKey = `0x${btcAccount.compressedPublicKey}` as `0x${string}`;

      const signature = await createSignature(
        wallet,
        privateKey,
        message,
        evmAddress
      );

      await mapping.write.linkAddress(
        [publicKey, evmAddress, message, signature as `0x${string}`],
        { account: user1.account }
      );

      expect(await mapping.read.isAddressLinked([publicKey])).to.be.true;

      await mapping.write.unlinkAddress([publicKey], {
        account: user1.account,
      });

      expect(await mapping.read.isAddressLinked([publicKey])).to.be.false;
      expect(await mapping.read.isEvmAddressLinked([evmAddress])).to.be.false;
      expect(await mapping.read.getEvmAddress([publicKey])).to.equal(
        "0x0000000000000000000000000000000000000000"
      );
      expect(await mapping.read.getBtcPubKeyHash([evmAddress])).to.equal(
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Reject unlinking non-registered address", async function () {
      const { mapping, user1 } = await loadFixture(deploy);

      const publicKey =
        "0x0311223344556677889900112233445566778899001122334455667788990011";

      await expect(
        mapping.write.unlinkAddress([publicKey], { account: user1.account })
      ).to.be.rejectedWith("NotRegistered");
    });

    it("Reject unauthorized unlinking", async function () {
      const { mapping, wallet, privateKey, btcAccount, user1, user2 } =
        await loadFixture(deploy);

      const message = "Link my Bitcoin address";
      const evmAddress = user1.account.address;
      const publicKey = `0x${btcAccount.compressedPublicKey}` as `0x${string}`;

      const signature = await createSignature(
        wallet,
        privateKey,
        message,
        evmAddress
      );

      await mapping.write.linkAddress(
        [publicKey, evmAddress, message, signature as `0x${string}`],
        { account: user1.account }
      );

      await expect(
        mapping.write.unlinkAddress([publicKey], { account: user2.account })
      ).to.be.rejectedWith("Unauthorized");
    });
  });
});
