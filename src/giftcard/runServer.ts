import "dotenv/config";
import { BlockfrostProvider } from "@meshsdk/core";
import { MeshWallet } from "@meshsdk/core";
import { MeshTxBuilder, Asset } from "@meshsdk/core";
import { MeshGiftCardContract } from "./offchainServer";
import { getWalletDappAddress } from "../wallet-utilities";

const APIKEY = process.env.BLOCKFROST_API!;
const SEEDPHRASENAMI = process.env.SEEDPHRASENAMI!;

export type walletSentToServerInfoType = {
  networkId: number;
  collateralTxHash: string;
  collateralOutputIndex: number;
  collateraAddress: string;
  changeAddress: string;
  rewardAddresses: string[];
  unusedAddresses: string[];
  usedAddresses: string[];
  address: string;
}

const run = async () => {
  const blockchainProvider = new BlockfrostProvider(APIKEY);

  //this is on the client, but instead of MeshWallet use Broweser Wallet, and no need to specify fetcher

  const walletBrowser = new MeshWallet({
    networkId: 0, // 0: testnet, 1: mainnet
    fetcher: blockchainProvider,
    key: {
      type: "mnemonic",
      words: [SEEDPHRASENAMI],
    },
  });

  const balance = await walletBrowser.getBalance();
  const changeAddress = await walletBrowser.getChangeAddress();
  const collateralTxHash = (await walletBrowser.getCollateral())[0].input.txHash;
  const collateralOutputIndex = (await walletBrowser.getCollateral())[0].input.outputIndex;
  const collateraAddress = (await walletBrowser.getCollateral())[0].output.address
  const networkId = await walletBrowser.getNetworkId();
  const rewardAddresses = await walletBrowser.getRewardAddresses();
  const unusedAddresses = await walletBrowser.getUnusedAddresses();
  const usedAddresses = await walletBrowser.getUsedAddresses();
  const address = await getWalletDappAddress(walletBrowser);
  const lovelace = await walletBrowser.getLovelace();
  const assets = await walletBrowser.getAssets();
  const policyIds = await walletBrowser.getPolicyIds();

  console.log({
    balance,
    changeAddress,
    collateralTxHash,
    collateralOutputIndex,
    networkId,
    rewardAddresses,
    unusedAddresses,
    usedAddresses,
    address,
    lovelace,
    assets,
    policyIds,
  });

  const walletSentToServerInfo: walletSentToServerInfoType = { 
    networkId,       
    collateralTxHash,
    collateralOutputIndex,
    collateraAddress,
    changeAddress,    
    rewardAddresses,
    unusedAddresses,
    usedAddresses,
    address   
  };

  console.log("walletSentToServer", walletSentToServerInfo)

  //this is on the server

  const meshTxBuilder = new MeshTxBuilder({
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
  });

  const contract = new MeshGiftCardContract(
    {
      mesh: meshTxBuilder,
      fetcher: blockchainProvider,
      networkId: walletSentToServerInfo.networkId,
    },
    walletSentToServerInfo
  );

  const giftValue: Asset[] = [
    {
      unit: "lovelace",
      quantity: "10000000",
    },
  ];

  const unsignedTx = await contract.createGiftCard("Mesh_Gift_Card", giftValue);

  const signedTx = walletBrowser.signTx(unsignedTx);
  const txHash = await meshTxBuilder.submitTx(signedTx);
  console.log({unsignedTx, signedTx, txHash});

  blockchainProvider.onTxConfirmed(txHash!, () => {
    console.log(`${txHash} submitted to the blockchain`);
  });
};

const run2 = async (txHash: string) => {
  const blockchainProvider = new BlockfrostProvider(APIKEY);

  //this is on the client

  const walletBrowser = new MeshWallet({
    networkId: 0, // 0: testnet, 1: mainnet
    fetcher: blockchainProvider,
    key: {
      type: "mnemonic",
      words: [SEEDPHRASENAMI],
    },
  });

  const balance = await walletBrowser.getBalance();
  const changeAddress = await walletBrowser.getChangeAddress();
  const collateralTxHash = (await walletBrowser.getCollateral())[0].input.txHash;
  const collateralOutputIndex = (await walletBrowser.getCollateral())[0].input.outputIndex;
  const collateraAddress = (await walletBrowser.getCollateral())[0].output.address
  const networkId = await walletBrowser.getNetworkId();
  const rewardAddresses = await walletBrowser.getRewardAddresses();
  const unusedAddresses = await walletBrowser.getUnusedAddresses();
  const usedAddresses = await walletBrowser.getUsedAddresses();
  const address = await getWalletDappAddress(walletBrowser);
  const lovelace = await walletBrowser.getLovelace();
  const assets = await walletBrowser.getAssets();
  const policyIds = await walletBrowser.getPolicyIds();

  console.log({
    balance,
    changeAddress,
    collateralTxHash,
    collateralOutputIndex,
    networkId,
    rewardAddresses,
    unusedAddresses,
    usedAddresses,
    address,
    lovelace,
    assets,
    policyIds,
  });

  const walletSentToServerInfo: walletSentToServerInfoType = { 
    networkId,       
    collateralTxHash,
    collateralOutputIndex,
    collateraAddress,
    changeAddress,    
    rewardAddresses,
    unusedAddresses,
    usedAddresses,
    address   
  };

  console.log("walletSentToServer", walletSentToServerInfo)

  //this is on the server

  const meshTxBuilder = new MeshTxBuilder({
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
  });
  const contract = new MeshGiftCardContract(
    {
      mesh: meshTxBuilder,
      fetcher: blockchainProvider,
      networkId: 0,
    },
    walletSentToServerInfo
  );

  const utxo = await contract.getUtxoByTxHash(txHash);
  if (utxo) {
    const unsignedTx2 = await contract.redeemGiftCard(utxo);
    const signedTx2 = walletBrowser.signTx(unsignedTx2);
    const txHash2 = await meshTxBuilder.submitTx(signedTx2);
    console.log({unsignedTx2, signedTx2, txHash2});
  }
};

// run();
run2("596ff7f980afaa9297273ef2a3bc34ae8d52d0a3182b509ca82ccc8a29a27aff");
