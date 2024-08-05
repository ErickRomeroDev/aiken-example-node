import "dotenv/config";
import { BlockfrostProvider } from "@meshsdk/core";
import { MeshWallet } from "@meshsdk/core";
import { MeshTxBuilder, Asset } from "@meshsdk/core";
import { MeshGiftCardContract } from "./offchain";

const APIKEY = process.env.BLOCKFROST_API!;
const SEEDPHRASENAMI = process.env.SEEDPHRASENAMI!;

const run = async () => {
  const blockchainProvider = new BlockfrostProvider(APIKEY);

  const wallet = new MeshWallet({
    networkId: 0, // 0: testnet, 1: mainnet
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    key: {
      type: "mnemonic",
      words: [SEEDPHRASENAMI],
    },
  });

  const meshTxBuilder = new MeshTxBuilder({
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
  });

  const contract = new MeshGiftCardContract({
    mesh: meshTxBuilder,
    fetcher: blockchainProvider,
    wallet: wallet,
    networkId: 0,
  });

  const giftValue: Asset[] = [
    {
      unit: "lovelace",
      quantity: "10000000",
    },
  ];

  const tx = await contract.createGiftCard("Mesh_Gift_Card", giftValue);
  const signedTx = wallet.signTx(tx);
  const txHash = await wallet.submitTx(signedTx);
  console.log("tx", txHash);

  blockchainProvider.onTxConfirmed(txHash, () => {
    console.log(`${txHash} submitted to the blockchain`);
  });
};

const run2 = async (txHash: string) => {
  const blockchainProvider = new BlockfrostProvider(APIKEY);

  const wallet = new MeshWallet({
    networkId: 0, // 0: testnet, 1: mainnet
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    key: {
      type: "mnemonic",
      words: [SEEDPHRASENAMI],
    },
  });

  const meshTxBuilder = new MeshTxBuilder({
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
  });

  const contract = new MeshGiftCardContract({
    mesh: meshTxBuilder,
    fetcher: blockchainProvider,
    wallet: wallet,
    networkId: 0,
  });

  const utxo = await contract.getUtxoByTxHash(txHash);
  if (utxo) {
    const tx2 = await contract.redeemGiftCard(utxo);
    const signedTx2 = wallet.signTx(tx2);
    const txHash2 = await wallet.submitTx(signedTx2);
    console.log("tx2", txHash2);
  }
};

// run();
run2("efe94abf50209b6a6dda1c2fcf92e572fb947d10992b365637481e04882ec38b");
