const hre = require("hardhat");

async function main() {
  const CardNFT = await hre.ethers.getContractFactory("CardNFT");
  const card = await CardNFT.deploy();
  await card.waitForDeployment();
  console.log("CardNFT deployed to:", await card.getAddress());

  const GameLogic = await hre.ethers.getContractFactory("GameLogic");
  const game = await GameLogic.deploy(await card.getAddress());
  await game.waitForDeployment();
  console.log("GameLogic deployed to:", await game.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
