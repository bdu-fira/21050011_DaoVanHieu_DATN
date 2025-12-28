const hre = require("hardhat");

async function main() {
  console.log("Deploying DigitalCertificate contract...");

  const CertificateFactory = await hre.ethers.getContractFactory("DigitalCertificate");
  const certificateContract = await CertificateFactory.deploy();
  const contractAddress = await certificateContract.getAddress();
  console.log(`Smart Contract deployed successfully to: ${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});