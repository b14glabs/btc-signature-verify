import "@nomicfoundation/hardhat-toolbox-viem";
import type { HardhatUserConfig } from "hardhat/config";
require("@openzeppelin/hardhat-upgrades");

const config: HardhatUserConfig = {
  solidity: "0.8.24",
};

export default config;
