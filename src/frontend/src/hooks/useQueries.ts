import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DispatchRecord,
  ItemMaster,
  OverlockRecord,
  ProductionRecord,
  TailorRecord,
} from "../backend";
import { useActor } from "./useActor";

export function useGetRecords() {
  const { actor, isFetching } = useActor();
  return useQuery<ProductionRecord[]>({
    queryKey: ["records"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getProductionRecords();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMasterNames() {
  const { actor, isFetching } = useActor();
  return useQuery<string[]>({
    queryKey: ["masterNames"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMasterNames();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMasterReport() {
  const { actor, isFetching } = useActor();
  return useQuery<Array<[string, number, number]>>({
    queryKey: ["masterReport"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMasterReport();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetArticleReport() {
  const { actor, isFetching } = useActor();
  return useQuery<Array<[string, number]>>({
    queryKey: ["articleReport"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getArticleReport();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      date: string;
      articleNo: string;
      masterName: string;
      dispatchedPcs: number;
      cutByMaster: number;
      rate: number;
      percentage: number;
      totalPcs: number;
      finalAmount: number;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addProductionRecord(
        params.date,
        params.articleNo,
        params.masterName,
        Number.parseFloat(String(params.dispatchedPcs)),
        Number.parseFloat(String(params.cutByMaster)),
        Number.parseFloat(String(params.rate)),
        Number.parseFloat(String(params.percentage)),
        Number.parseFloat(String(params.totalPcs)),
        Number.parseFloat(String(params.finalAmount)),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["records"] });
      queryClient.invalidateQueries({ queryKey: ["masterNames"] });
      queryClient.invalidateQueries({ queryKey: ["masterReport"] });
      queryClient.invalidateQueries({ queryKey: ["articleReport"] });
    },
  });
}

export function useDeleteRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteProductionRecord(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["records"] });
      queryClient.invalidateQueries({ queryKey: ["masterReport"] });
      queryClient.invalidateQueries({ queryKey: ["articleReport"] });
    },
  });
}

// ─── Tailor Hooks ───────────────────────────────────────────────────────────

export function useGetTailorRecords() {
  const { actor, isFetching } = useActor();
  return useQuery<TailorRecord[]>({
    queryKey: ["tailorRecords"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTailorRecords();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTailorReport() {
  const { actor, isFetching } = useActor();
  return useQuery<Array<[string, number, number]>>({
    queryKey: ["tailorReport"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTailorReport();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddTailorRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      date: string;
      articleNo: string;
      tailorName: string;
      pcsGiven: number;
      tailorRate: number;
      tailorAmount: number;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addTailorRecord(
        params.date,
        params.articleNo,
        params.tailorName,
        Number.parseFloat(String(params.pcsGiven)),
        Number.parseFloat(String(params.tailorRate)),
        Number.parseFloat(String(params.tailorAmount)),
        "",
        "",
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tailorRecords"] });
      queryClient.invalidateQueries({ queryKey: ["tailorReport"] });
      queryClient.invalidateQueries({ queryKey: ["articleRemaining"] });
    },
  });
}

export function useDeleteTailorRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteTailorRecord(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tailorRecords"] });
      queryClient.invalidateQueries({ queryKey: ["tailorReport"] });
      queryClient.invalidateQueries({ queryKey: ["articleRemaining"] });
    },
  });
}

// ─── Overlock Hooks ──────────────────────────────────────────────────────────

export function useGetOverlockRecords() {
  const { actor, isFetching } = useActor();
  return useQuery<OverlockRecord[]>({
    queryKey: ["overlockRecords"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getOverlockRecords();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetOverlockReport() {
  const { actor, isFetching } = useActor();
  return useQuery<Array<[string, number, number]>>({
    queryKey: ["overlockReport"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getOverlockReport();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddOverlockRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      date: string;
      articleNo: string;
      employeeName: string;
      size: string;
      quantity: number;
      pcsRate: number;
      finalAmount: number;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addOverlockRecord(
        params.date,
        params.articleNo,
        params.employeeName,
        params.size,
        Number.parseFloat(String(params.quantity)),
        Number.parseFloat(String(params.pcsRate)),
        Number.parseFloat(String(params.finalAmount)),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overlockRecords"] });
      queryClient.invalidateQueries({ queryKey: ["overlockReport"] });
    },
  });
}

export function useDeleteOverlockRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteOverlockRecord(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overlockRecords"] });
      queryClient.invalidateQueries({ queryKey: ["overlockReport"] });
    },
  });
}

// ─── Item Master Hooks ───────────────────────────────────────────────────────

export function useGetItemMasters() {
  const { actor, isFetching } = useActor();
  return useQuery<ItemMaster[]>({
    queryKey: ["itemMasters"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getItemMasters();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetItemMasterByArticle(articleNo: string) {
  const { actor, isFetching } = useActor();
  return useQuery<ItemMaster | null>({
    queryKey: ["itemMasterByArticle", articleNo],
    queryFn: async () => {
      if (!actor || !articleNo) return null;
      return actor.getItemMasterByArticle(articleNo);
    },
    enabled: !!actor && !isFetching && !!articleNo,
  });
}

export function useGetArticleRemainingBySize(articleNo: string) {
  const { actor, isFetching } = useActor();
  return useQuery<number | null>({
    queryKey: ["articleRemaining", articleNo],
    queryFn: async () => {
      if (!actor || !articleNo) return null;
      return actor.getArticleRemainingQty(articleNo);
    },
    enabled: !!actor && !isFetching && !!articleNo,
  });
}

export function useGetDispatchedQtyByArticle(articleNo: string) {
  const { actor, isFetching } = useActor();
  return useQuery<number>({
    queryKey: ["dispatchedQty", articleNo],
    queryFn: async () => {
      if (!actor || !articleNo) return 0;
      return actor.getDispatchedQtyByArticle(articleNo);
    },
    enabled: !!actor && !isFetching && !!articleNo,
  });
}

export function useAddItemMaster() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      articleNo: string;
      totalQuantity: number;
      sizeS: number;
      sizeM: number;
      sizeL: number;
      sizeXL: number;
      sizeXXL: number;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addItemMaster(
        params.articleNo,
        params.totalQuantity,
        "",
        false,
        "",
        0,
        params.sizeS ?? 0,
        params.sizeM ?? 0,
        params.sizeL ?? 0,
        params.sizeXL ?? 0,
        params.sizeXXL ?? 0,
        0,
        0,
        0,
        "",
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itemMasters"] });
    },
  });
}

export function useUpdateItemMaster() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: bigint;
      articleNo: string;
      totalQuantity: number;
      sizeS: number;
      sizeM: number;
      sizeL: number;
      sizeXL: number;
      sizeXXL: number;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateItemMaster(
        params.id,
        params.articleNo,
        params.totalQuantity,
        "",
        false,
        "",
        0,
        params.sizeS ?? 0,
        params.sizeM ?? 0,
        params.sizeL ?? 0,
        params.sizeXL ?? 0,
        params.sizeXXL ?? 0,
        0,
        0,
        0,
        "",
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itemMasters"] });
      queryClient.invalidateQueries({ queryKey: ["itemMasterByArticle"] });
      queryClient.invalidateQueries({ queryKey: ["articleRemaining"] });
    },
  });
}

export function useDeleteItemMaster() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteItemMaster(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itemMasters"] });
    },
  });
}

// ─── Dispatch Hooks ──────────────────────────────────────────────────────────

export function useGetDispatchRecords() {
  const { actor, isFetching } = useActor();
  return useQuery<DispatchRecord[]>({
    queryKey: ["dispatchRecords"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getDispatchRecords();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddDispatchRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      date: string;
      articleNo: string;
      dispatchQuantity: number;
      salePrice: number;
      percentage: number;
      finalPayment: number;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addDispatchRecord(
        params.articleNo,
        "",
        params.date,
        params.dispatchQuantity,
        params.salePrice,
        params.percentage,
        "",
        "",
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatchRecords"] });
      queryClient.invalidateQueries({ queryKey: ["dispatchedQty"] });
    },
  });
}

export function useUpdateDispatchRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: bigint;
      date: string;
      articleNo: string;
      dispatchQuantity: number;
      salePrice: number;
      percentage: number;
      finalPayment: number;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.updateDispatchRecord(
        params.id,
        params.articleNo,
        "",
        params.date,
        params.dispatchQuantity,
        params.salePrice,
        params.percentage,
        "",
        "",
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatchRecords"] });
      queryClient.invalidateQueries({ queryKey: ["dispatchedQty"] });
    },
  });
}

export function useDeleteDispatchRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteDispatchRecord(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatchRecords"] });
      queryClient.invalidateQueries({ queryKey: ["dispatchedQty"] });
    },
  });
}
