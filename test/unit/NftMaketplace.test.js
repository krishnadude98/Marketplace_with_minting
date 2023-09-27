const { assert, expect } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("NFT Marketplace Tests", function () {
          let nftMarketplace, deployer, player;
          const PRICE = ethers.parseEther("0.1");
          const TOKEN_ID = 0;
          beforeEach(async function () {
              accounts = await ethers.getSigners();
              deployer = accounts[0];
              player = accounts[1];
              await deployments.fixture(["all"]);
              nftMarketplace = await ethers.getContract("NftMarketplace");
              await nftMarketplace.mintNft("test");
              await nftMarketplace.approve(nftMarketplace.getAddress(), TOKEN_ID);
          });

          it("list and can be bought", async function () {
              await nftMarketplace.listItem(nftMarketplace.getAddress(), TOKEN_ID, PRICE);
              const playerConnectedMarketplace = await nftMarketplace.connect(player);
              await playerConnectedMarketplace.buyItem(nftMarketplace.getAddress(), TOKEN_ID, {
                  value: PRICE,
              });
              const newOwner = await nftMarketplace.ownerOf(TOKEN_ID);
              const deployerProceeds = await nftMarketplace.getProceeds(deployer.address);
              assert.equal(newOwner.toString(), player.address);
              assert(deployerProceeds.toString() === PRICE.toString());
          });
          describe("list item tests", function () {
              it("fails if no approval is set", async function () {
                  await nftMarketplace.approve(
                      "0x0000000000000000000000000000000000000000",
                      TOKEN_ID,
                  );
                  await expect(
                      nftMarketplace.listItem(nftMarketplace.getAddress(), TOKEN_ID, PRICE),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__NotApprovedForMarketplace",
                  );
              });
              it("fails if listing same nft again", async function () {
                  await nftMarketplace.listItem(nftMarketplace.getAddress(), TOKEN_ID, PRICE);
                  await expect(
                      nftMarketplace.listItem(nftMarketplace.getAddress(), TOKEN_ID, PRICE),
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__AlreadyListed");
              });
              it("fails if not owner", async function () {
                  await nftMarketplace.approve(player.getAddress(), TOKEN_ID);
                  const playerConnectedMarketplace = await nftMarketplace.connect(player);
                  expect(
                      playerConnectedMarketplace.listItem(
                          nftMarketplace.getAddress(),
                          TOKEN_ID,
                          PRICE,
                      ),
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotOwner");
              });
              it("fails for price=0", async function () {
                  await expect(
                      nftMarketplace.listItem(nftMarketplace.getAddress(), TOKEN_ID, "0"),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__PriceMustBeAboveZero",
                  );
              });
          });

          describe("buy item test", async function () {
              let playerConnectedMarketplace;
              beforeEach(async function () {
                  await nftMarketplace.listItem(nftMarketplace.getAddress(), TOKEN_ID, PRICE);
                  playerConnectedMarketplace = await nftMarketplace.connect(player);
              });
              it("allows to buy", async function () {
                  await playerConnectedMarketplace.buyItem(nftMarketplace.getAddress(), TOKEN_ID, {
                      value: PRICE,
                  });
              });
              it("fails if nft not listed", async function () {
                  await expect(
                      playerConnectedMarketplace.buyItem(nftMarketplace.getAddress(), "1", {
                          value: PRICE,
                      }),
                  ).to.be.revertedWithCustomError(
                      playerConnectedMarketplace,
                      "NftMarketplace__NotListed",
                  );
              });
              it("fails if price is less than specified price", async () => {
                  it("allows to buy", async function () {
                      await playerConnectedMarketplace.buyItem(
                          nftMarketplace.getAddress(),
                          TOKEN_ID,
                          {
                              value: ethers.parseEther("0.01"),
                          },
                      );
                  });
              });
          });
          describe("cancel listing tests", async () => {
              it("cancels listing WOKS", async function () {
                  await nftMarketplace.listItem(nftMarketplace.getAddress(), TOKEN_ID, PRICE);
                  await nftMarketplace.cancelListing(nftMarketplace.getAddress(), TOKEN_ID);
                  let listing = await nftMarketplace.getListing(
                      nftMarketplace.getAddress(),
                      TOKEN_ID,
                  );
                  assert.equal(listing.price.toString(), "0");
              });
              it("fails if not owner", async function () {
                  await nftMarketplace.listItem(nftMarketplace.getAddress(), TOKEN_ID, PRICE);
                  const playerConnectedMarketplace = await nftMarketplace.connect(player);
                  await expect(
                      playerConnectedMarketplace.cancelListing(
                          nftMarketplace.getAddress(),
                          TOKEN_ID,
                      ),
                  ).to.be.revertedWithCustomError(
                      playerConnectedMarketplace,
                      "NftMarketplace__NotOwner",
                  );
              });
              it("fails if not listed listing is tryed to canceled", async function () {
                  await expect(
                      nftMarketplace.cancelListing(nftMarketplace.getAddress(), TOKEN_ID),
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotListed");
              });
          });
          describe("updateListing tests", function () {
              it("modifying listing price works", async function () {
                  const uPrice = ethers.parseEther("1");
                  await nftMarketplace.listItem(nftMarketplace.getAddress(), TOKEN_ID, PRICE);
                  await nftMarketplace.updateListing(nftMarketplace.getAddress(), TOKEN_ID, uPrice);
                  let updatedPrice = await nftMarketplace.getListing(
                      nftMarketplace.getAddress(),
                      TOKEN_ID,
                  );
                  assert.equal(updatedPrice.price.toString(), uPrice.toString());
              });
              it("fails if not owner", async () => {
                  const uPrice = ethers.parseEther("1");
                  await nftMarketplace.listItem(nftMarketplace.getAddress(), TOKEN_ID, PRICE);
                  const playerConnectedMarketplace = await nftMarketplace.connect(player);
                  await expect(
                      playerConnectedMarketplace.updateListing(
                          nftMarketplace.getAddress(),
                          TOKEN_ID,
                          uPrice,
                      ),
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotOwner");
              });
              it("fails if not listed nft is tried to be updated", async () => {
                  const uPrice = ethers.parseEther("1");
                  await expect(
                      nftMarketplace.updateListing(nftMarketplace.getAddress(), TOKEN_ID, uPrice),
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotListed");
              });
          });
          describe("withdraw proceeds test", async function () {
              it("should withdraw all the earnings", async () => {
                  await nftMarketplace.listItem(nftMarketplace.getAddress(), TOKEN_ID, PRICE);
                  let oldbal = await ethers.provider.getBalance(deployer.address);
                  const playerConnectedMarketplace = await nftMarketplace.connect(player);
                  await playerConnectedMarketplace.buyItem(nftMarketplace.getAddress(), TOKEN_ID, {
                      value: PRICE,
                  });
                  await nftMarketplace.withdrawProceeds();
                  let newbal = await ethers.provider.getBalance(deployer.address);
                  assert(newbal > oldbal);
              });
              it("fails if balance is 0", async () => {
                  await nftMarketplace.listItem(nftMarketplace.getAddress(), TOKEN_ID, PRICE);
                  await expect(nftMarketplace.withdrawProceeds()).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__NoProceeds",
                  );
              });
          });
      });
describe("Nft tests", () => {
    beforeEach(async function () {
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        player = accounts[1];
        await deployments.fixture(["all"]);
        nftMarketplace = await ethers.getContract("NftMarketplace");
    });
    it("mints nfts", async () => {
        await nftMarketplace.mintNft("test");
        let bal = await nftMarketplace.balanceOf(deployer.getAddress());
        assert.equal(bal, "1");
    });
    it("sets token  url corrrectly", async () => {
        await nftMarketplace.mintNft("test");
        let url = await nftMarketplace.tokenURI("0");
        assert.equal(url, "test");
    });
});
