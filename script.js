const dataLayer = (() => {
  const dl = {
    suppliers: [{
      _id: 1,
      number: 20,
      viewName: "Rubber Chicken Ltd",
      details: "13 Some Road, SomePlace, 23948 Burgh" },
    {
      _id: 2,
      number: 22,
      viewName: "Pulley Inc.",
      details: "Pulley Square, Out There, A637Z3 Boondocks" }],


    bookingsSource: [{
      _id: 1,
      number: 1,
      date: new Date(2016, 0, 3),
      details: "Monthly Pulley payment",
      supplier_id: 2,
      amount: 12.59,
      currency: "USD" },
    {
      _id: 1,
      number: 2,
      date: new Date(2016, 0, 4),
      details: "Big Rubber Chicken order",
      supplier_id: 1,
      amount: 47623.45,
      currency: "BOO" }],


    supplierDataStore: new DevExpress.data.CustomStore({
      key: "_id",
      load: function () {// using this
        return dl.suppliers;
      },
      insert: function (v) {
        return $.Deferred(d => {
          dl.suppliers.push(v);
          d.resolve(v._id);
        }).promise();
      } }),


    supplierPopupDataStore: new DevExpress.data.CustomStore({
      key: "_id",
      load: function () {
        const that = this;
        return $.Deferred(d => {
          const result = that.customFilter ?
          that.getFilteredData(that.customFilter) : dl.suppliers;
          that._totalCount = result.length;
          d.resolve(result, {
            totalCount: that._totalCount });

        }).promise();
      },
      totalCount: function () {
        return this._totalCount ? this._totalCount : 0;
      } }) };



  dl.supplierPopupDataStore.supplierByKey = key => {
    return dl.suppliers.find(s => s._id === key);
  };

  dl.supplierPopupDataStore.indexByKey = key => {
    return dl.suppliers.findIndex(s => s._id === key);
  };

  dl.supplierPopupDataStore.indexByObject = o => {
    return dl.suppliers.findIndex(s => s._id === o._id);
  };

  ["supplierByKey", "indexByKey", "indexByObject"].forEach(s => dl.supplierDataStore[s] = dl.supplierPopupDataStore[s]);

  dl.supplierPopupDataStore.customFilter = "";
  dl.supplierPopupDataStore.getFilteredData = filterString => {
    function* conditionalYield(row, yieldedIds) {
      if (!yieldedIds.includes(row._id)) {
        yieldedIds.push(row._id);
        yield row;
      }
    }

    function* preciseNumbers(yieldedIds) {
      for (let row of dl.suppliers) {
        if (row.number == filterString) {
          yield* conditionalYield(row, yieldedIds);
        }
      }
    }

    function* partialNumbers(yieldedIds) {
      for (let row of dl.suppliers) {
        if (row.number.toString().includes(filterString)) {
          yield* conditionalYield(row, yieldedIds);
        }
      }
    }

    function* partialViewName(yieldedIds) {
      for (let row of dl.suppliers) {
        if (row.viewName.includes(filterString)) {
          yield* conditionalYield(row, yieldedIds);
        }
      }
    }

    function* partialDetails(yieldedIds) {
      for (let row of dl.suppliers) {
        if (row.details.includes(filterString)) {
          yield* conditionalYield(row, yieldedIds);
        }
      }
    }

    function* combine() {
      let yieldedIds = [];
      yield* preciseNumbers(yieldedIds);
      yield* partialNumbers(yieldedIds);
      yield* partialViewName(yieldedIds);
      yield* partialDetails(yieldedIds);
    }
    return Array.from(combine());
  };

  return dl;
})();


function createDataGrid(targetElement,
{ bookingsSource, supplierDataStore, supplierPopupDataStore },
{ confirmAssignment, escapeOut, createNewSupplier }) {
  const supplierDisplayString = s => s ? `${s.number} - ${s.viewName}` : "Not assigned";
  const bookingSupplierDisplayString = b => supplierDisplayString(supplierDataStore.supplierByKey(b.supplier_id));

  targetElement.dxDataGrid({
    dataSource: bookingsSource,
    columns: [{
      dataField: "number",
      dataType: "number",
      format: {
        type: "decimal",
        precision: 5 },

      allowEditing: false },
    {
      dataField: "date",
      dataType: "date" },

    "amount",
    "currency",
    "details", {
      dataField: "supplier_id",
      caption: "Supplier",
      calculateDisplayValue: bookingSupplierDisplayString,
      lookup: {
        dataSource: {
          store: supplierDataStore },

        valueExpr: "_id",
        displayExpr: supplierDisplayString },

      editCellTemplate: (cellElement, cellInfo) => {
        const $editor = createCellEditor(cellElement, cellInfo);
        showPopup(cellElement, cellInfo, supplierDataStore, supplierPopupDataStore, $editor, confirmAssignment, escapeOut, createNewSupplier);
      } }],


    editing: {
      mode: "batch",
      allowAdding: true,
      allowDeleting: true,
      allowUpdating: true } });


}

function showPopup(cellElement, cellInfo, supplierDataStore, supplierPopupDataStore, $editor, confirmAssignment, escapeOut, createNewSupplier) {
  const popup = $('<div class="dx-dropdowneditor-overlay">').appendTo(cellElement).dxPopover({
    height: "60ex",
    width: "60ex",
    showTitle: false,
    showCloseButton: false,
    shading: false,
    position: {
      collision: "flipfit flipfit",
      my: "top",
      at: "bottom" },

    toolbarItems: [{
      toolbar: "top",
      widget: "dxButton",
      location: "before",
      options: {
        text: "New Supplier (Alt-N)",
        accessKey: "n" } },

    {
      toolbar: "bottom",
      widget: "dxButton",
      location: "after",
      options: {
        text: "OK",
        type: "default" } },

    {
      toolbar: "bottom",
      widget: "dxButton",
      location: "after",
      options: {
        text: "Cancel" } }],


    contentTemplate: () => createPopupForm(supplierPopupDataStore),
    onContentReady: ({ component }) => {
      const $form = component.content().children().first();
      const form = $form.dxForm("instance");
      const detailForm = $("#osPopupSupplierDetailForm").dxForm("instance");
      const list = $("#osPopupSupplierList").dxList("instance");
      const searchBox = form.getEditor("search");

      list.selectItem(supplierPopupDataStore.indexByKey(cellInfo.value));
      list.on("selectionChanged", ({ addedItems }) => {
        if (addedItems.length > 0) {
          detailForm.option("formData", addedItems[0]);
        }
      });
      searchBox.on("valueChanged", ({ value }) => {
        supplierPopupDataStore.customFilter = value;
        list.reload();
        list.selectItem(0);
      });


      let creatingNew = false;

      const confirmAssignmentHandler = () => confirmAssignment(cellInfo, supplierDataStore, $editor, detailForm, popup, creatingNew, list.option("selectedItems"));
      const escapeOutHandler = () => escapeOut(component);
      const upArrowHandler = () => upArrow(supplierPopupDataStore, list);
      const downArrowHandler = () => downArrow(supplierPopupDataStore, list);

      // new supplier button
      component.option("toolbarItems[0].onClick", function () {// function, not lambda
        createNewSupplier(this, searchBox, list, detailForm);
        creatingNew = true;
      });
      // OK button
      component.option("toolbarItems[1].onClick", confirmAssignmentHandler);
      // Cancel button
      component.option("toolbarItems[2].onClick", escapeOutHandler);

      list.element().dblclick(confirmAssignmentHandler);
      list.registerKeyHandler("upArrow", upArrowHandler);
      list.registerKeyHandler("downArrow", downArrowHandler);
      list.registerKeyHandler("enter", confirmAssignment);
      list.registerKeyHandler("escape", escapeOut);

      searchBox.registerKeyHandler("upArrow", upArrowHandler);
      searchBox.registerKeyHandler("downArrow", downArrowHandler);

      form.registerKeyHandler("enter", confirmAssignmentHandler);
      form.registerKeyHandler("escape", escapeOutHandler);
    },
    onShown: ({ component }) => {
      const $form = component.content().children().first();
      const form = $form.dxForm("instance");
      const searchBox = form.getEditor("search");
      const list = $("#osPopupSupplierList").dxList("instance");

      if (supplierPopupDataStore.customFilter) {
        supplierPopupDataStore.customFilter = "";
        list.reload();
      }

      searchBox.focus();
    },
    onHidden: () => $("#grid").dxDataGrid("instance").closeEditCell() }).
  dxPopover("instance");

  popup.option("position.of", $editor);
  setTimeout(() => {
    popup.show();
  });
}

function createPopupForm(store) {
  return $("<div>").dxForm({
    items: [{
      name: "search",
      itemType: "simple",
      editorType: "dxTextBox",
      editorOptions: {
        placeholder: "Search for a supplier",
        mode: "search",
        value: "", // set this to prevent erroneous change events in the future
        valueChangeEvent: "keyup" } },

    {
      name: "list",
      itemType: "simple",
      template: () => createPopupSupplierList(store) },
    {
      itemType: "empty" },
    {
      name: "detailform",
      itemType: "simple",
      template: () => createPopupSupplierDetailForm() }] });


}

function createPopupSupplierList(store) {
  return $('<div id="osPopupSupplierList">').dxList({
    dataSource: {
      store: store },

    selectionMode: "single",
    itemTemplate: (itemData, itemIndex, itemElement) => {
      itemElement.text(`${itemData.number} - ${itemData.viewName}`);
    } });

}

function createPopupSupplierDetailForm() {
  return $('<div id="osPopupSupplierDetailForm">').dxForm({
    labelLocation: "top",
    disabled: true,
    items: [{
      itemType: "group",
      colCount: 4,
      items: [{
        itemType: "simple",
        dataField: "number",
        colSpan: 1,
        isRequired: true,
        editorOptions: {
          placeholder: "Number" } },

      {
        itemType: "simple",
        dataField: "viewName",
        colSpan: 3,
        isRequired: true,
        label: {
          text: "Name" },

        editorOptions: {
          placeholder: "Name" } },

      {
        itemType: "simple",
        dataField: "details",
        editorType: "dxTextArea",
        colSpan: 4,
        editorOptions: {
          height: "12ex",
          placeholder: "Supplier Details" } }] }] });




}

function confirmAssignment(cellInfo, store, $cellEditor, detailForm, popup, creatingNew, selectedItems) {
  if (creatingNew) {
    const vr = detailForm.validate();
    if (vr.isValid) {
      const newSupplier = detailForm.option("formData");
      // useless way of generating a random id
      newSupplier._id = parseInt(Math.random() * 1000000);
      store.insert(newSupplier);
      $cellEditor.dxTextBox("instance").option("value", cellInfo.column.lookup.displayExpr(newSupplier));
      cellInfo.setValue(newSupplier._id);
      popup.hide();
    }
  } else {
    if (selectedItems.length == 1) {
      $cellEditor.dxTextBox("instance").option("value", cellInfo.column.lookup.displayExpr(selectedItems[0]));
      cellInfo.setValue(selectedItems[0]._id);
      popup.hide();
    }
  }
}

function upArrow(store, list) {
  store.totalCount().done(count => {
    if (count > 0) {
      const selectedItems = list.option("selectedItems");
      const currentIndex = selectedItems ?
      store.indexByObject(selectedItems[0]) : 1;
      if (currentIndex > 0) {
        list.selectItem(currentIndex - 1);
      }
    }
  });
}

function downArrow(store, list) {
  store.totalCount().done(count => {
    if (count > 0) {
      const selectedItems = list.option("selectedItems");
      const currentIndex = selectedItems ?
      store.indexByObject(selectedItems[0]) : -1;
      const newIndex = currentIndex + 1;
      if (newIndex >= 0 && newIndex < count) {
        list.selectItem(currentIndex + 1);
      }
    }
  });
}

function escapeOut(popup) {
  popup.hide();
}

function createNewSupplier(button, searchBox, list, detailForm) {
  button.option("disabled", true);

  list.option("disabled", true);
  searchBox.option("disabled", true);
  detailForm.option("disabled", false);
  detailForm.option("formData", {});
  detailForm.getEditor("number").focus();
}

function createCellEditor(cellElement, cellInfo) {
  return $("<div>").appendTo(cellElement).dxTextBox({
    readOnly: true,
    value: cellInfo.text });

}

createDataGrid($("#grid"),
dataLayer,
{ confirmAssignment, escapeOut, createNewSupplier });