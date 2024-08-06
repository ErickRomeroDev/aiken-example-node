import { MeshWallet, UTxO } from "@meshsdk/core";

export const getWalletDappAddress = async (wallet: MeshWallet) => {
  if (wallet) {
    const usedAddresses = await wallet.getUsedAddresses();
    if (usedAddresses.length > 0) {
      return usedAddresses[0];
    }
    const unusedAddresses = await wallet.getUnusedAddresses();
    if (unusedAddresses.length > 0) {
      return unusedAddresses[0];
    }
  }
  return "";
};

export const getWalletCollateral = async (wallet: MeshWallet): Promise<UTxO | undefined> => {
  if (wallet) {
    const utxos = await wallet.getCollateral();
    return utxos[0];
  }
  return undefined;
};

export const getWalletUtxosWithMinLovelace = async (wallet: MeshWallet, lovelace: number, providedUtxos: UTxO[] = []) => {
  let utxos: UTxO[] = providedUtxos;
  if (wallet && (!providedUtxos || providedUtxos.length === 0)) {
    utxos = await wallet.getUtxos();
  }
  return utxos.filter((u) => {
    const lovelaceAmount = u.output.amount.find((a: any) => a.unit === "lovelace")?.quantity;
    return Number(lovelaceAmount) > lovelace;
  });
};

export const getWalletUtxosWithToken = async (wallet: MeshWallet, assetHex: string, userUtxos: UTxO[] = []) => {
  let utxos: UTxO[] = userUtxos;
  if (wallet && userUtxos.length === 0) {
    utxos = await wallet.getUtxos();
  }
  return utxos.filter((u) => {
    const assetAmount = u.output.amount.find((a: any) => a.unit === assetHex)?.quantity;
    return Number(assetAmount) >= 1;
  });
};

export const getWalletInfoForTx = async (wallet: MeshWallet) => {
  const utxos = await wallet?.getUtxos();
  const collateral = await getWalletCollateral(wallet);
  const walletAddress = await getWalletDappAddress(wallet);
  if (!utxos || utxos?.length === 0) {
    throw new Error("No utxos found");
  }
  if (!collateral) {
    throw new Error("No collateral found");
  }
  if (!walletAddress) {
    throw new Error("No wallet address found");
  }
  return { utxos, collateral, walletAddress };
};
