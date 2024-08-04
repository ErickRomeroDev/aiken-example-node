import 'dotenv/config'
import { BlockfrostProvider } from '@meshsdk/core';
import { MeshWallet } from '@meshsdk/core';

const APIKEY = process.env.BLOCKFROST_API!;
const SEEDPHRASENAMI = process.env.SEEDPHRASENAMI!;

const blockchainProvider = new BlockfrostProvider(APIKEY);

const wallet = new MeshWallet({
    networkId: 0, // 0: testnet, 1: mainnet
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    key: {
      type: 'mnemonic',
      words: [SEEDPHRASENAMI],
    },
  });

  const address = wallet.getChangeAddress();
  console.log(address)
