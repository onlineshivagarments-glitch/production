import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Float "mo:core/Float";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Order "mo:core/Order";



actor {
  type ItemMaster = {
    id : Nat;
    articleNo : Text;
    totalQuantity : Float;
    colors : Text; // comma-separated
    hasAdditionalWork : Bool;
    workTypes : Text; // comma-separated
    sizeXS : Float;
    sizeS : Float;
    sizeM : Float;
    sizeL : Float;
    sizeXL : Float;
    sizeXXL : Float;
    size3XL : Float;
    size4XL : Float;
    size5XL : Float;
    colorSizeData : Text; // JSON encoded color-size-qty map
  };

  type TailorRecord = {
    id : Nat;
    date : Text;
    articleNo : Text;
    tailorName : Text;
    pcsGiven : Float;
    tailorRate : Float;
    tailorAmount : Float;
    color : Text;
    size : Text;
  };

  module TailorRecord {
    public func compareByDateDescending(record1 : TailorRecord, record2 : TailorRecord) : Order.Order {
      switch (Text.compare(record2.date, record1.date)) {
        case (#equal) { Nat.compare(record1.id, record2.id) };
        case (order) { order };
      };
    };
  };

  type DispatchRecord = {
    id : Nat;
    articleNo : Text;
    partyName : Text;
    dispatchDate : Text;
    dispatchPcs : Float;
    salePrice : Float;
    percentage : Float;
    finalPayment : Float;
    sizeWiseBreakup : Text;
    colorWiseBreakup : Text;
  };

  type AdditionalWorkRecord = {
    id : Nat;
    date : Text;
    articleNo : Text;
    workType : Text;
    employeeName : Text;
    pcsDone : Float;
    ratePerPcs : Float;
    totalAmount : Float;
    color : Text;
    size : Text;
  };

  type ProductionRecord = {
    id : Nat;
    date : Text;
    articleNo : Text;
    partyName : Text;
    dispatchedPcs : Float;
    cutByMaster : Float;
    rate : Float;
    percentage : Float;
    totalPcs : Float;
    finalAmount : Float;
  };

  module ProductionRecord {
    public func compareByDateDescending(record1 : ProductionRecord, record2 : ProductionRecord) : Order.Order {
      switch (Text.compare(record2.date, record1.date)) {
        case (#equal) { Nat.compare(record1.id, record2.id) };
        case (order) { order };
      };
    };
  };

  type OverlockRecord = {
    id : Nat;
    date : Text;
    articleNo : Text;
    employeeName : Text;
    size : Text;
    quantity : Float;
    pcsRate : Float;
    finalAmount : Float;
  };

  module OverlockRecord {
    public func compareByDateDescending(record1 : OverlockRecord, record2 : OverlockRecord) : Order.Order {
      switch (Text.compare(record2.date, record1.date)) {
        case (#equal) { Nat.compare(record1.id, record2.id) };
        case (order) { order };
      };
    };
  };

  type FinishedStockSummary = {
    articleNo : Text;
    totalProduced : Float;
    totalDispatched : Float;
    available : Float;
  };

  type ProductionMismatch = {
    articleNo : Text;
    cuttingQty : Float;
    stitchedQty : Float;
    dispatchedQty : Float;
  };

  type FabricConsumptionReport = {
    articleNo : Text;
    fabricPerPiece : Float;
    totalCutting : Float;
    totalFabricUsed : Float;
  };

  // Stable storage (survives canister upgrades)
  stable var nextId : Nat = 0;
  stable var itemMastersStable : [(Nat, ItemMaster)] = [];
  stable var tailorRecordsStable : [(Nat, TailorRecord)] = [];
  stable var dispatchRecordsStable : [(Nat, DispatchRecord)] = [];
  stable var additionalWorkRecordsStable : [(Nat, AdditionalWorkRecord)] = [];
  stable var productionRecordsStable : [(Nat, ProductionRecord)] = [];
  stable var overlockRecordsStable : [(Nat, OverlockRecord)] = [];
  stable var fabricDataStable : [(Text, Float)] = [];

  // Working heap maps (rebuilt from stable on upgrade)
  var itemMasters = Map.empty<Nat, ItemMaster>();
  var tailorRecords = Map.empty<Nat, TailorRecord>();
  var dispatchRecords = Map.empty<Nat, DispatchRecord>();
  var additionalWorkRecords = Map.empty<Nat, AdditionalWorkRecord>();
  var productionRecords = Map.empty<Nat, ProductionRecord>();
  var overlockRecords = Map.empty<Nat, OverlockRecord>();
  var fabricData = Map.empty<Text, Float>();

  // Restore heap maps from stable storage on startup
  do {
    for ((k, v) in itemMastersStable.vals()) { itemMasters.add(k, v) };
    for ((k, v) in tailorRecordsStable.vals()) { tailorRecords.add(k, v) };
    for ((k, v) in dispatchRecordsStable.vals()) { dispatchRecords.add(k, v) };
    for ((k, v) in additionalWorkRecordsStable.vals()) { additionalWorkRecords.add(k, v) };
    for ((k, v) in productionRecordsStable.vals()) { productionRecords.add(k, v) };
    for ((k, v) in overlockRecordsStable.vals()) { overlockRecords.add(k, v) };
    for ((k, v) in fabricDataStable.vals()) { fabricData.add(k, v) };
  };

  system func preupgrade() {
    itemMastersStable := itemMasters.entries().toArray();
    tailorRecordsStable := tailorRecords.entries().toArray();
    dispatchRecordsStable := dispatchRecords.entries().toArray();
    additionalWorkRecordsStable := additionalWorkRecords.entries().toArray();
    productionRecordsStable := productionRecords.entries().toArray();
    overlockRecordsStable := overlockRecords.entries().toArray();
    fabricDataStable := fabricData.entries().toArray();
  };

  system func postupgrade() {
    itemMastersStable := [];
    tailorRecordsStable := [];
    dispatchRecordsStable := [];
    additionalWorkRecordsStable := [];
    productionRecordsStable := [];
    overlockRecordsStable := [];
    fabricDataStable := [];
  };

  // ===== CLEAR ALL DATA =====
  public shared ({ caller }) func clearAllData() : async () {
    itemMasters := Map.empty<Nat, ItemMaster>();
    tailorRecords := Map.empty<Nat, TailorRecord>();
    dispatchRecords := Map.empty<Nat, DispatchRecord>();
    additionalWorkRecords := Map.empty<Nat, AdditionalWorkRecord>();
    productionRecords := Map.empty<Nat, ProductionRecord>();
    overlockRecords := Map.empty<Nat, OverlockRecord>();
    fabricData := Map.empty<Text, Float>();
    nextId := 0;
  };

  // Fabric Data functions
  public shared ({ caller }) func setFabricPerPiece(articleNo : Text, fabricPerPiece : Float) : async () {
    fabricData.add(articleNo, fabricPerPiece);
  };

  public query ({ caller }) func getFabricPerPiece(articleNo : Text) : async Float {
    switch (fabricData.get(articleNo)) {
      case (?fabricPerPiece) { fabricPerPiece };
      case (null) { 0.0 };
    };
  };

  // ItemMaster CRUD
  public shared ({ caller }) func addItemMaster(
    articleNo : Text,
    totalQuantity : Float,
    colors : Text,
    hasAdditionalWork : Bool,
    workTypes : Text,
    sizeXS : Float,
    sizeS : Float,
    sizeM : Float,
    sizeL : Float,
    sizeXL : Float,
    sizeXXL : Float,
    size3XL : Float,
    size4XL : Float,
    size5XL : Float,
    colorSizeData : Text,
  ) : async Nat {
    let id = nextId;
    nextId += 1;

    let itemMaster : ItemMaster = {
      id;
      articleNo;
      totalQuantity;
      colors;
      hasAdditionalWork;
      workTypes;
      sizeXS;
      sizeS;
      sizeM;
      sizeL;
      sizeXL;
      sizeXXL;
      size3XL;
      size4XL;
      size5XL;
      colorSizeData;
    };

    itemMasters.add(id, itemMaster);
    id;
  };

  public query ({ caller }) func getItemMasters() : async [ItemMaster] {
    itemMasters.values().toArray();
  };

  public shared ({ caller }) func updateItemMaster(
    id : Nat,
    articleNo : Text,
    totalQuantity : Float,
    colors : Text,
    hasAdditionalWork : Bool,
    workTypes : Text,
    sizeXS : Float,
    sizeS : Float,
    sizeM : Float,
    sizeL : Float,
    sizeXL : Float,
    sizeXXL : Float,
    size3XL : Float,
    size4XL : Float,
    size5XL : Float,
    colorSizeData : Text,
  ) : async Bool {
    switch (itemMasters.get(id)) {
      case (?_) {
        let updatedItemMaster : ItemMaster = {
          id;
          articleNo;
          totalQuantity;
          colors;
          hasAdditionalWork;
          workTypes;
          sizeXS;
          sizeS;
          sizeM;
          sizeL;
          sizeXL;
          sizeXXL;
          size3XL;
          size4XL;
          size5XL;
          colorSizeData;
        };
        itemMasters.add(id, updatedItemMaster);
        true;
      };
      case (null) { false };
    };
  };

  public shared ({ caller }) func deleteItemMaster(id : Nat) : async Bool {
    if (itemMasters.containsKey(id)) {
      itemMasters.remove(id);
      true;
    } else {
      false;
    };
  };

  public query ({ caller }) func getItemMasterByArticle(articleNo : Text) : async ?ItemMaster {
    let iter = itemMasters.values();
    let found = iter.find(
      func(item) {
        item.articleNo == articleNo;
      }
    );
    switch (found) {
      case (?item) { ?item };
      case (null) { null };
    };
  };

  // TailorRecord CRUD
  public shared ({ caller }) func addTailorRecord(
    date : Text,
    articleNo : Text,
    tailorName : Text,
    pcsGiven : Float,
    tailorRate : Float,
    tailorAmount : Float,
    color : Text,
    size : Text,
  ) : async Nat {
    let id = nextId;
    nextId += 1;

    let record : TailorRecord = {
      id;
      date;
      articleNo;
      tailorName;
      pcsGiven;
      tailorRate;
      tailorAmount;
      color;
      size;
    };

    tailorRecords.add(id, record);
    id;
  };

  public query ({ caller }) func getTailorRecords() : async [TailorRecord] {
    tailorRecords.values().toArray().sort(TailorRecord.compareByDateDescending);
  };

  public shared ({ caller }) func updateTailorRecord(
    id : Nat,
    date : Text,
    articleNo : Text,
    tailorName : Text,
    pcsGiven : Float,
    tailorRate : Float,
    tailorAmount : Float,
    color : Text,
    size : Text,
  ) : async Bool {
    switch (tailorRecords.get(id)) {
      case (?_) {
        let updatedRecord : TailorRecord = {
          id;
          date;
          articleNo;
          tailorName;
          pcsGiven;
          tailorRate;
          tailorAmount;
          color;
          size;
        };
        tailorRecords.add(id, updatedRecord);
        true;
      };
      case (null) { false };
    };
  };

  public shared ({ caller }) func deleteTailorRecord(id : Nat) : async Bool {
    if (tailorRecords.containsKey(id)) {
      tailorRecords.remove(id);
      true;
    } else {
      false;
    };
  };

  public query ({ caller }) func getTailorReport() : async [(Text, Float, Float)] {
    let tailorMap = Map.empty<Text, (Float, Float)>();

    tailorRecords.values().forEach(
      func(record) {
        switch (tailorMap.get(record.tailorName)) {
          case (?existing) {
            let (pcs, amount) = existing;
            tailorMap.add(record.tailorName, (pcs + record.pcsGiven, amount + record.tailorAmount));
          };
          case (null) {
            tailorMap.add(record.tailorName, (record.pcsGiven, record.tailorAmount));
          };
        };
      }
    );

    tailorMap.entries().toArray().map(
      func((tailorName, totals)) {
        let (totalPcs, totalAmount) = totals;
        (tailorName, totalPcs, totalAmount);
      }
    );
  };

  // DispatchRecord CRUD
  public shared ({ caller }) func addDispatchRecord(
    articleNo : Text,
    partyName : Text,
    dispatchDate : Text,
    dispatchPcs : Float,
    salePrice : Float,
    percentage : Float,
    sizeWiseBreakup : Text,
    colorWiseBreakup : Text,
  ) : async Nat {
    let id = nextId;
    nextId += 1;
    let finalPayment = dispatchPcs * salePrice * percentage / 100.0;

    let record : DispatchRecord = {
      id;
      articleNo;
      partyName;
      dispatchDate;
      dispatchPcs;
      salePrice;
      percentage;
      finalPayment;
      sizeWiseBreakup;
      colorWiseBreakup;
    };

    dispatchRecords.add(id, record);
    id;
  };

  public query ({ caller }) func getDispatchRecords() : async [DispatchRecord] {
    dispatchRecords.values().toArray();
  };

  public shared ({ caller }) func updateDispatchRecord(
    id : Nat,
    articleNo : Text,
    partyName : Text,
    dispatchDate : Text,
    dispatchPcs : Float,
    salePrice : Float,
    percentage : Float,
    sizeWiseBreakup : Text,
    colorWiseBreakup : Text,
  ) : async Bool {
    switch (dispatchRecords.get(id)) {
      case (?_) {
        let finalPayment = dispatchPcs * salePrice * percentage / 100.0;
        let updatedRecord : DispatchRecord = {
          id;
          articleNo;
          partyName;
          dispatchDate;
          dispatchPcs;
          salePrice;
          percentage;
          finalPayment;
          sizeWiseBreakup;
          colorWiseBreakup;
        };
        dispatchRecords.add(id, updatedRecord);
        true;
      };
      case (null) { false };
    };
  };

  public shared ({ caller }) func deleteDispatchRecord(id : Nat) : async Bool {
    if (dispatchRecords.containsKey(id)) {
      dispatchRecords.remove(id);
      true;
    } else {
      false;
    };
  };

  public query ({ caller }) func getDispatchedQtyByArticle(articleNo : Text) : async Float {
    let filtered = dispatchRecords.values().toArray().filter(
      func(record) { record.articleNo == articleNo }
    );

    filtered.foldLeft(0.0, func(acc, record) { acc + record.dispatchPcs });
  };

  // AdditionalWorkRecord CRUD
  public shared ({ caller }) func addAdditionalWorkRecord(
    date : Text,
    articleNo : Text,
    workType : Text,
    employeeName : Text,
    pcsDone : Float,
    ratePerPcs : Float,
    color : Text,
    size : Text,
  ) : async Nat {
    let id = nextId;
    nextId += 1;
    let totalAmount = pcsDone * ratePerPcs;

    let record : AdditionalWorkRecord = {
      id;
      date;
      articleNo;
      workType;
      employeeName;
      pcsDone;
      ratePerPcs;
      totalAmount;
      color;
      size;
    };

    additionalWorkRecords.add(id, record);
    id;
  };

  public query ({ caller }) func getAdditionalWorkRecords() : async [AdditionalWorkRecord] {
    additionalWorkRecords.values().toArray();
  };

  public shared ({ caller }) func updateAdditionalWorkRecord(
    id : Nat,
    date : Text,
    articleNo : Text,
    workType : Text,
    employeeName : Text,
    pcsDone : Float,
    ratePerPcs : Float,
    color : Text,
    size : Text,
  ) : async Bool {
    switch (additionalWorkRecords.get(id)) {
      case (?_) {
        let totalAmount = pcsDone * ratePerPcs;
        let updatedRecord : AdditionalWorkRecord = {
          id;
          date;
          articleNo;
          workType;
          employeeName;
          pcsDone;
          ratePerPcs;
          totalAmount;
          color;
          size;
        };
        additionalWorkRecords.add(id, updatedRecord);
        true;
      };
      case (null) { false };
    };
  };

  public shared ({ caller }) func deleteAdditionalWorkRecord(id : Nat) : async Bool {
    if (additionalWorkRecords.containsKey(id)) {
      additionalWorkRecords.remove(id);
      true;
    } else {
      false;
    };
  };

  public query ({ caller }) func getAdditionalWorkByArticle(articleNo : Text) : async [AdditionalWorkRecord] {
    additionalWorkRecords.values().toArray().filter(
      func(record) { record.articleNo == articleNo }
    );
  };

  // ProductionRecord functions (old compat)
  public shared ({ caller }) func addProductionRecord(
    date : Text,
    articleNo : Text,
    partyName : Text,
    dispatchedPcs : Float,
    cutByMaster : Float,
    rate : Float,
    percentage : Float,
    totalPcs : Float,
    finalAmount : Float,
  ) : async Nat {
    let id = nextId;
    nextId += 1;

    let record : ProductionRecord = {
      id;
      date;
      articleNo;
      partyName;
      dispatchedPcs;
      cutByMaster;
      rate;
      percentage;
      totalPcs;
      finalAmount;
    };

    productionRecords.add(id, record);
    id;
  };

  public query ({ caller }) func getProductionRecords() : async [ProductionRecord] {
    productionRecords.values().toArray().sort(ProductionRecord.compareByDateDescending);
  };

  public shared ({ caller }) func deleteProductionRecord(id : Nat) : async Bool {
    if (productionRecords.containsKey(id)) {
      productionRecords.remove(id);
      true;
    } else {
      false;
    };
  };

  public shared ({ caller }) func updateProductionRecord(
    id : Nat,
    date : Text,
    articleNo : Text,
    partyName : Text,
    dispatchedPcs : Float,
    cutByMaster : Float,
    rate : Float,
    percentage : Float,
    totalPcs : Float,
    finalAmount : Float,
  ) : async Bool {
    switch (productionRecords.get(id)) {
      case (?_) {
        let updatedRecord : ProductionRecord = {
          id;
          date;
          articleNo;
          partyName;
          dispatchedPcs;
          cutByMaster;
          rate;
          percentage;
          totalPcs;
          finalAmount;
        };
        productionRecords.add(id, updatedRecord);
        true;
      };
      case (null) { false };
    };
  };

  public query ({ caller }) func getMasterReport() : async [(Text, Float, Float)] {
    let masterMap = Map.empty<Text, (Float, Float)>();

    productionRecords.values().forEach(
      func(record) {
        switch (masterMap.get(record.partyName)) {
          case (?existing) {
            let (pcs, amount) = existing;
            masterMap.add(record.partyName, (pcs + record.totalPcs, amount + record.finalAmount));
          };
          case (null) {
            masterMap.add(record.partyName, (record.totalPcs, record.finalAmount));
          };
        };
      }
    );

    masterMap.entries().toArray().map(
      func((masterName, totals)) {
        let (totalPcs, totalAmount) = totals;
        (masterName, totalPcs, totalAmount);
      }
    );
  };

  public query ({ caller }) func getArticleReport() : async [(Text, Float)] {
    let articleMap = Map.empty<Text, Float>();

    productionRecords.values().forEach(
      func(record) {
        switch (articleMap.get(record.articleNo)) {
          case (?existing) {
            articleMap.add(record.articleNo, existing + record.totalPcs);
          };
          case (null) {
            articleMap.add(record.articleNo, record.totalPcs);
          };
        };
      }
    );

    articleMap.entries().toArray();
  };

  public query ({ caller }) func getMasterNames() : async [Text] {
    let masterSet = Map.empty<Text, ()>();

    productionRecords.values().forEach(
      func(record) {
        masterSet.add(record.partyName, ());
      }
    );

    masterSet.keys().toArray();
  };

  // OverlockRecord functions (old compat)
  public shared ({ caller }) func addOverlockRecord(
    date : Text,
    articleNo : Text,
    employeeName : Text,
    size : Text,
    quantity : Float,
    pcsRate : Float,
    finalAmount : Float,
  ) : async Nat {
    let id = nextId;
    nextId += 1;

    let record : OverlockRecord = {
      id;
      date;
      articleNo;
      employeeName;
      size;
      quantity;
      pcsRate;
      finalAmount;
    };

    overlockRecords.add(id, record);
    id;
  };

  public query ({ caller }) func getOverlockRecords() : async [OverlockRecord] {
    overlockRecords.values().toArray().sort(OverlockRecord.compareByDateDescending);
  };

  public shared ({ caller }) func deleteOverlockRecord(id : Nat) : async Bool {
    if (overlockRecords.containsKey(id)) {
      overlockRecords.remove(id);
      true;
    } else {
      false;
    };
  };

  public shared ({ caller }) func updateOverlockRecord(
    id : Nat,
    date : Text,
    articleNo : Text,
    employeeName : Text,
    size : Text,
    quantity : Float,
    pcsRate : Float,
    finalAmount : Float,
  ) : async Bool {
    switch (overlockRecords.get(id)) {
      case (?_) {
        let updatedRecord : OverlockRecord = {
          id;
          date;
          articleNo;
          employeeName;
          size;
          quantity;
          pcsRate;
          finalAmount;
        };
        overlockRecords.add(id, updatedRecord);
        true;
      };
      case (null) { false };
    };
  };

  public query ({ caller }) func getOverlockReport() : async [(Text, Float, Float)] {
    let overlockMap = Map.empty<Text, (Float, Float)>();

    overlockRecords.values().forEach(
      func(record) {
        switch (overlockMap.get(record.employeeName)) {
          case (?existing) {
            let (qty, amount) = existing;
            overlockMap.add(record.employeeName, (qty + record.quantity, amount + record.finalAmount));
          };
          case (null) {
            overlockMap.add(record.employeeName, (record.quantity, record.finalAmount));
          };
        };
      }
    );

    overlockMap.entries().toArray().map(
      func((employeeName, totals)) {
        let (totalQty, totalAmount) = totals;
        (employeeName, totalQty, totalAmount);
      }
    );
  };

  // Additional Functions
  public query ({ caller }) func getArticleRemainingQty(articleNo : Text) : async ?Float {
    switch (itemMasters.values().toArray().find(func(item) { item.articleNo == articleNo })) {
      case (?item) {
        let totalDispatched = dispatchRecords.values().toArray().foldLeft(
          0.0,
          func(acc, record) {
            if (record.articleNo == articleNo) {
              acc + record.dispatchPcs;
            } else { acc };
          },
        );
        ?(item.totalQuantity - totalDispatched);
      };
      case (null) { null };
    };
  };

  public query ({ caller }) func getPaymentSummary() : async [(Text, Float, Float)] {
    let paymentMap = Map.empty<Text, (Float, Float)>();

    dispatchRecords.values().forEach(
      func(record) {
        switch (paymentMap.get(record.partyName)) {
          case (?existing) {
            let (pcs, amount) = existing;
            paymentMap.add(record.partyName, (pcs + record.dispatchPcs, amount + record.finalPayment));
          };
          case (null) {
            paymentMap.add(record.partyName, (record.dispatchPcs, record.finalPayment));
          };
        };
      }
    );

    paymentMap.entries().toArray().map(
      func((partyName, totals)) {
        let (totalPcs, totalAmount) = totals;
        (partyName, totalPcs, totalAmount);
      }
    );
  };

  public query ({ caller }) func getStitchedQtyByColorSize(articleNo : Text, color : Text, size : Text) : async Float {
    let filtered = tailorRecords.values().toArray().filter(
      func(record) {
        record.articleNo == articleNo and record.color == color and record.size == size
      }
    );
    filtered.foldLeft(0.0, func(acc, record) { acc + record.pcsGiven });
  };

  public query ({ caller }) func getAdditionalWorkQtyByColorSize(articleNo : Text, color : Text, size : Text) : async Float {
    let filtered = additionalWorkRecords.values().toArray().filter(
      func(record) {
        record.articleNo == articleNo and record.color == color and record.size == size
      }
    );
    filtered.foldLeft(0.0, func(acc, record) { acc + record.pcsDone });
  };

  // New Queries for Updated Production Master
  public query ({ caller }) func getTailorQtyByArticle(articleNo : Text) : async Float {
    let filtered = tailorRecords.values().toArray().filter(
      func(record) { record.articleNo == articleNo }
    );

    filtered.foldLeft(0.0, func(acc, record) { acc + record.pcsGiven });
  };

  public query ({ caller }) func getFinishedStockSummary() : async [FinishedStockSummary] {
    let uniqueArticles = getUniqueArticles();

    uniqueArticles.map(
      func(articleNo) {
        let totalProduced = tailorRecords.values().toArray().filter(
          func(record) { record.articleNo == articleNo }
        ).foldLeft(0.0, func(acc, record) { acc + record.pcsGiven });

        let totalDispatched = dispatchRecords.values().toArray().filter(
          func(record) { record.articleNo == articleNo }
        ).foldLeft(0.0, func(acc, record) { acc + record.dispatchPcs });

        {
          articleNo;
          totalProduced;
          totalDispatched;
          available = totalProduced - totalDispatched;
        };
      }
    );
  };

  func getUniqueArticles() : [Text] {
    let articleMap = Map.empty<Text, ()>();

    tailorRecords.values().forEach(func(record) { articleMap.add(record.articleNo, ()) });
    dispatchRecords.values().forEach(func(record) { articleMap.add(record.articleNo, ()) });

    articleMap.keys().toArray();
  };

  public query ({ caller }) func getProductionMismatches() : async [ProductionMismatch] {
    let itemMastersArray = itemMasters.values().toArray();

    itemMastersArray.map(
      func(item) {
        let stitchedQty = tailorRecords.values().toArray().filter(
          func(record) { record.articleNo == item.articleNo }
        ).foldLeft(0.0, func(acc, record) { acc + record.pcsGiven });

        let dispatchedQty = dispatchRecords.values().toArray().filter(
          func(record) { record.articleNo == item.articleNo }
        ).foldLeft(0.0, func(acc, record) { acc + record.dispatchPcs });

        {
          articleNo = item.articleNo;
          cuttingQty = item.totalQuantity;
          stitchedQty;
          dispatchedQty;
        };
      }
    );
  };

  public query ({ caller }) func getFabricConsumptionReport() : async [FabricConsumptionReport] {
    let itemMastersArray = itemMasters.values().toArray();

    itemMastersArray.map(
      func(item) {
        let fabricPerPiece = switch (fabricData.get(item.articleNo)) {
          case (?fabricPerPiece) { fabricPerPiece };
          case (null) { 0.0 };
        };

        {
          articleNo = item.articleNo;
          fabricPerPiece;
          totalCutting = item.totalQuantity;
          totalFabricUsed = fabricPerPiece * item.totalQuantity;
        };
      }
    );
  };

  public query ({ caller }) func getAvailableStock(articleNo : Text) : async Float {
    let totalProduced = tailorRecords.values().toArray().filter(
      func(record) { record.articleNo == articleNo }
    ).foldLeft(0.0, func(acc, record) { acc + record.pcsGiven });

    let totalDispatched = dispatchRecords.values().toArray().filter(
      func(record) { record.articleNo == articleNo }
    ).foldLeft(0.0, func(acc, record) { acc + record.dispatchPcs });

    totalProduced - totalDispatched;
  };
};
