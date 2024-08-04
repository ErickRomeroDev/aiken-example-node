import { MeshTxInitiator, MeshTxInitiatorInput } from "../common";
import { v2ScriptToBech32, getV2ScriptHash, parseDatumCbor, applyParamsToScript } from "@meshsdk/core-csl";
import { mConStr0, builtinByteString, txOutRef, stringToHex, BuiltinByteString, List, Integer, mConStr1, UTxO, Asset } from "@meshsdk/common";
// import { Asset, UTxO } from "@meshsdk/core";
import blueprint from "./aiken-workspace/plutus.json";

export class MeshGiftCardContract extends MeshTxInitiator {
  tokenNameHex: string = "";
  paramUtxo: UTxO["input"] = { outputIndex: 0, txHash: "" };

  giftCardCbor = (tokenNameHex: string, utxoTxHash: string, utxoTxId: number) =>
    applyParamsToScript(blueprint.validators[0].compiledCode, [
      builtinByteString(tokenNameHex),
      txOutRef(utxoTxHash, utxoTxId),
    ]);
}
