import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ProductionMismatch {
    cuttingQty: number;
    dispatchedQty: number;
    articleNo: string;
    stitchedQty: number;
}
export interface FabricConsumptionReport {
    fabricPerPiece: number;
    articleNo: string;
    totalCutting: number;
    totalFabricUsed: number;
}
export interface DispatchRecord {
    id: bigint;
    dispatchDate: string;
    dispatchPcs: number;
    finalPayment: number;
    articleNo: string;
    sizeWiseBreakup: string;
    salePrice: number;
    partyName: string;
    percentage: number;
    colorWiseBreakup: string;
}
export interface OverlockRecord {
    id: bigint;
    finalAmount: number;
    employeeName: string;
    pcsRate: number;
    date: string;
    size: string;
    articleNo: string;
    quantity: number;
}
export interface FinishedStockSummary {
    totalProduced: number;
    totalDispatched: number;
    available: number;
    articleNo: string;
}
export interface AdditionalWorkRecord {
    id: bigint;
    workType: string;
    employeeName: string;
    pcsDone: number;
    date: string;
    color: string;
    size: string;
    ratePerPcs: number;
    articleNo: string;
    totalAmount: number;
}
export interface ProductionRecord {
    id: bigint;
    finalAmount: number;
    dispatchedPcs: number;
    date: string;
    rate: number;
    totalPcs: number;
    articleNo: string;
    cutByMaster: number;
    partyName: string;
    percentage: number;
}
export interface TailorRecord {
    id: bigint;
    pcsGiven: number;
    date: string;
    tailorName: string;
    color: string;
    tailorRate: number;
    size: string;
    articleNo: string;
    tailorAmount: number;
}
export interface ItemMaster {
    id: bigint;
    size3XL: number;
    size4XL: number;
    size5XL: number;
    sizeXXL: number;
    hasAdditionalWork: boolean;
    sizeL: number;
    sizeM: number;
    sizeS: number;
    articleNo: string;
    sizeXL: number;
    sizeXS: number;
    colors: string;
    workTypes: string;
    colorSizeData: string;
    totalQuantity: number;
}
export interface backendInterface {
    addAdditionalWorkRecord(date: string, articleNo: string, workType: string, employeeName: string, pcsDone: number, ratePerPcs: number, color: string, size: string): Promise<bigint>;
    addDispatchRecord(articleNo: string, partyName: string, dispatchDate: string, dispatchPcs: number, salePrice: number, percentage: number, sizeWiseBreakup: string, colorWiseBreakup: string): Promise<bigint>;
    addItemMaster(articleNo: string, totalQuantity: number, colors: string, hasAdditionalWork: boolean, workTypes: string, sizeXS: number, sizeS: number, sizeM: number, sizeL: number, sizeXL: number, sizeXXL: number, size3XL: number, size4XL: number, size5XL: number, colorSizeData: string): Promise<bigint>;
    addOverlockRecord(date: string, articleNo: string, employeeName: string, size: string, quantity: number, pcsRate: number, finalAmount: number): Promise<bigint>;
    addProductionRecord(date: string, articleNo: string, partyName: string, dispatchedPcs: number, cutByMaster: number, rate: number, percentage: number, totalPcs: number, finalAmount: number): Promise<bigint>;
    addTailorRecord(date: string, articleNo: string, tailorName: string, pcsGiven: number, tailorRate: number, tailorAmount: number, color: string, size: string): Promise<bigint>;
    deleteAdditionalWorkRecord(id: bigint): Promise<boolean>;
    deleteDispatchRecord(id: bigint): Promise<boolean>;
    deleteItemMaster(id: bigint): Promise<boolean>;
    deleteOverlockRecord(id: bigint): Promise<boolean>;
    deleteProductionRecord(id: bigint): Promise<boolean>;
    deleteTailorRecord(id: bigint): Promise<boolean>;
    getAdditionalWorkByArticle(articleNo: string): Promise<Array<AdditionalWorkRecord>>;
    getAdditionalWorkQtyByColorSize(articleNo: string, color: string, size: string): Promise<number>;
    getAdditionalWorkRecords(): Promise<Array<AdditionalWorkRecord>>;
    getArticleRemainingQty(articleNo: string): Promise<number | null>;
    getArticleReport(): Promise<Array<[string, number]>>;
    getAvailableStock(articleNo: string): Promise<number>;
    getDispatchRecords(): Promise<Array<DispatchRecord>>;
    getDispatchedQtyByArticle(articleNo: string): Promise<number>;
    getFabricConsumptionReport(): Promise<Array<FabricConsumptionReport>>;
    getFabricPerPiece(articleNo: string): Promise<number>;
    getFinishedStockSummary(): Promise<Array<FinishedStockSummary>>;
    getItemMasterByArticle(articleNo: string): Promise<ItemMaster | null>;
    getItemMasters(): Promise<Array<ItemMaster>>;
    getMasterNames(): Promise<Array<string>>;
    getMasterReport(): Promise<Array<[string, number, number]>>;
    getOverlockRecords(): Promise<Array<OverlockRecord>>;
    getOverlockReport(): Promise<Array<[string, number, number]>>;
    getPaymentSummary(): Promise<Array<[string, number, number]>>;
    getProductionMismatches(): Promise<Array<ProductionMismatch>>;
    getProductionRecords(): Promise<Array<ProductionRecord>>;
    getStitchedQtyByColorSize(articleNo: string, color: string, size: string): Promise<number>;
    getTailorQtyByArticle(articleNo: string): Promise<number>;
    getTailorRecords(): Promise<Array<TailorRecord>>;
    getTailorReport(): Promise<Array<[string, number, number]>>;
    setFabricPerPiece(articleNo: string, fabricPerPiece: number): Promise<void>;
    updateAdditionalWorkRecord(id: bigint, date: string, articleNo: string, workType: string, employeeName: string, pcsDone: number, ratePerPcs: number, color: string, size: string): Promise<boolean>;
    updateDispatchRecord(id: bigint, articleNo: string, partyName: string, dispatchDate: string, dispatchPcs: number, salePrice: number, percentage: number, sizeWiseBreakup: string, colorWiseBreakup: string): Promise<boolean>;
    updateItemMaster(id: bigint, articleNo: string, totalQuantity: number, colors: string, hasAdditionalWork: boolean, workTypes: string, sizeXS: number, sizeS: number, sizeM: number, sizeL: number, sizeXL: number, sizeXXL: number, size3XL: number, size4XL: number, size5XL: number, colorSizeData: string): Promise<boolean>;
    updateOverlockRecord(id: bigint, date: string, articleNo: string, employeeName: string, size: string, quantity: number, pcsRate: number, finalAmount: number): Promise<boolean>;
    updateProductionRecord(id: bigint, date: string, articleNo: string, partyName: string, dispatchedPcs: number, cutByMaster: number, rate: number, percentage: number, totalPcs: number, finalAmount: number): Promise<boolean>;
    updateTailorRecord(id: bigint, date: string, articleNo: string, tailorName: string, pcsGiven: number, tailorRate: number, tailorAmount: number, color: string, size: string): Promise<boolean>;
}
