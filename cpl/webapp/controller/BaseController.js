sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/Sorter",
	"sap/ui/model/FilterOperator",
	"sap/m/GroupHeaderListItem",
	"sap/ui/Device",
	"sap/ui/core/Fragment",
	"sap/m/MessageBox",
	"../model/formatter",
	"sap/m/MessageToast"
], function (Controller, History, JSONModel, Filter, Sorter, FilterOperator, GroupHeaderListItem, Device, Fragment, MessageBox, formatter,
	MessageToast) {
	"use strict";

	return Controller.extend("cf.cpl.controller.BaseController", {

		/**
		 * Convenience method for accessing the router in every controller of the application.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter: function () {
			return this.getOwnerComponent().getRouter();
		},

		/**
		 * Convenience method for getting the view model by name in every controller of the application.
		 * @public
		 * @param {string} sName the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function (sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model in every controller of the application.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Convenience method for getting the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Event handler for navigating back.
		 * It there is a history entry we go one step back in the browser history
		 * If not, it will replace the current entry of the browser history with the master route.
		 * @public
		 */
		onNavBack: function () {
			var sPreviousHash = History.getInstance().getPreviousHash();
			sap.ui.getCore().getModel("configModel").setProperty("/concatDataFlag", true);

			if (sPreviousHash !== undefined) {
				// eslint-disable-next-line sap-no-history-manipulation
				history.go(-1);
			} else {
				// sap.ui.getCore().getModel("configModel").setProperty("/concatDataFlag", true);
				this.getRouter().navTo("master", {}, true);
			}
		},

		// Reusable Function
		productCategory: function () {
			var proCat = {
				"ProductCategory": [{
					"key": "",
					"name": ""
				}, {
					"key": "Residential Broadloom",
					"name": "Residential Broadloom"
				}, {
					"key": "Resilient Tile",
					"name": "Resilient Tile & Plank"
				}, {
					"key": "RevWood",
					"name": "RevWood"
				}, {
					"key": "Carpet Tile",
					"name": "Carpet Tile"
				}, {
					"key": "Commercial Broadloom",
					"name": "Commercial Broadloom"
				}, {
					"key": "Cushion",
					"name": "Cushion"
				}, {
					"key": "TecWood",
					"name": "TecWood"
				}, {
					"key": "SolidWood",
					"name": "Solid Wood"
				}, {
					"key": "Resilient Sheet",
					"name": "Resilient Sheet"
				}, {
					"key": "Tile",
					"name": "Tile"
				}, {
					"key": "Accessories",
					"name": "Accessories"
				}]
			};

			return proCat;
		},

		onCategoryChange: function (oEvent) {
			// this.selectedCat = oEvent.getParameters().value;
			this.selectedCat = oEvent.getSource().getSelectedKey();
			sap.ui.getCore().getModel("configModel").setProperty("/selectedCat", this.selectedCat);
			this.fetchTotal = 100;
			this.fetchSkip = 0;
			this.getPageDetail();
			/*this._filterDisable();
			if (this.sortDialog) {
				this.sortDialog.destroy();
				delete this.sortDialog;
			}
			this.fetchProducts();*/
		},

		onWhChange: function (oEvent) {
			this.selectedWH = oEvent.getSource().getSelectedKey();
			sap.ui.getCore().getModel("configModel").setProperty("/selectedWH", this.selectedWH);
			this.fetchTotal = 100;
			this.fetchSkip = 0;
			// this.fetchProducts();
			this.getPageDetail();
		},

		onBrandChange: function (oEvent) {
			this.selectedChannel = oEvent.getParameters().value;
			sap.ui.getCore().getModel("configModel").setProperty("/selectedChannel", this.selectedChannel);
			this.fetchTotal = 100;
			this.fetchSkip = 0;
			// this.fetchProducts();
			this.getPageDetail();
		},

		getPageDetail: function () {
			var href = document.location.href;
			if (href.includes("AddProduct")) {
				this.pageName = "AddProduct";
				// this.fetchAddProducts();
			} else {
				this.pageName = "Master";
				// this._filterDisable();
				if (this.sortDialog) {
					this.sortDialog.destroy();
					delete this.sortDialog;
				}
				if (this.selectedCat !== "" && this.selectedCat !== undefined && this.selectedChannel !== "" && this.selectedChannel !== undefined &&
					this.selectedWH !== "" && this.selectedWH !== undefined) {
					this.getView().byId("addProductButton").setEnabled(true);
					this.getView().byId("multiPricing").setEnabled(true);
				} else {
					this.getView().byId("addProductButton").setEnabled(false);
					this.getView().byId("multiPricing").setEnabled(false);
				}
				this.getView().getModel("pViewModel").setData(undefined);
				this.fetchProducts();
			}
		},

		/*onFilter: function () {
			var ffVBox = sap.ui.getCore().byId("ffVBox");
			var filterData = this.filterData;
			var that = this;
			var selectedFilters = filterData.filter(function (c) {
				return c.category == that.selectedCat;
			});
			//var pViewModel = this.getView().getModel("pViewModel");
			var pViewModel = sap.ui.getCore().getModel("pViewModel");

			for (var i = 0; i < selectedFilters.length; i++) {
				if (selectedFilters[i].filter === "Brand") {
					pViewModel.setProperty("/brandsVisible", true);
				} else if (selectedFilters[i].filter === "Fiber") {
					pViewModel.setProperty("/fibersVisible", true);
				} else if (selectedFilters[i].filter === "Fiber Brand") {
					pViewModel.setProperty("/fiberBrandsVisible", true);
				} else if (selectedFilters[i].filter === "Construction") {
					pViewModel.setProperty("/constructionsVisible", true);
				} else if (selectedFilters[i].filter === "Weight") {
					pViewModel.setProperty("/weightsVisible", true);
				} else if (selectedFilters[i].filter === "Display Vechicle") {
					pViewModel.setProperty("/collectionsVisible", true);
				} else if (selectedFilters[i].filter === "Collection") {
					pViewModel.setProperty("/displayVehiclesVisible", true);
				} else if (selectedFilters[i].filter === "Category") {
					pViewModel.setProperty("/categoriesVisible", true);
				} else if (selectedFilters[i].filter === "Density") {
					pViewModel.setProperty("/densityVisible", true);
				} else if (selectedFilters[i].filter === "Gauge") {
					pViewModel.setProperty("/gaugeVisible", true);
				} else if (selectedFilters[i].filter === "Size") {
					pViewModel.setProperty("/sizeVisible", true);
				} else if (selectedFilters[i].filter === "Antimicrobial") {
					pViewModel.setProperty("/antimicrobialVisible", true);
				} else if (selectedFilters[i].filter === "Moisture Barriers") {
					pViewModel.setProperty("/moistureBarriersVisible", true);
				} else if (selectedFilters[i].filter === "Local Stock") {
					pViewModel.setProperty("/localStockVisible", true);
				} else if (selectedFilters[i].filter === "Segments") {
					pViewModel.setProperty("/segmentsVisible", true);
				} else if (selectedFilters[i].filter === "Width") {
					pViewModel.setProperty("/widthsVisible", true);
				} else if (selectedFilters[i].filter === "Species") {
					pViewModel.setProperty("/speciesVisible", true);
				} else if (selectedFilters[i].filter === "Textures") {
					pViewModel.setProperty("/texturesVisible", true);
				} else if (selectedFilters[i].filter === "Feature") {
					pViewModel.setProperty("/featuresVisible", true);
				} else if (selectedFilters[i].filter === "Core") {
					pViewModel.setProperty("/coresVisible", true);
				} else if (selectedFilters[i].filter === "Wear Layer") {
					pViewModel.setProperty("/wearLayerVisible", true);
				} else if (selectedFilters[i].filter === "Installation") {
					pViewModel.setProperty("/installationVisible", true);
				} else if (selectedFilters[i].filter === "Backing") {
					pViewModel.setProperty("/backingVisible", true);
				} else if (selectedFilters[i].filter === "Description") {
					pViewModel.setProperty("/descriptionsVisible", true);
				} else if (selectedFilters[i].filter === "Application") {
					pViewModel.setProperty("/applicationVisible", true);
				} else if (selectedFilters[i].filter === "Technology") {
					pViewModel.setProperty("/technologyVisible", true);
				} else if (selectedFilters[i].filter === "Thickness") {
					pViewModel.setProperty("/thicknessVisible", true);
				}
			}
			var pViewData = pViewModel.getData();
			var sDialogTab = "filter";
			if (!this.byId("filter")) {
				Fragment.load({
					id: this.getView().getId(),
					name: "cf.cpl.fragments.Filter",
					controller: this
				}).then(function (oDialog) {
					// connect dialog to the root view of this component (models, lifecycle)
					this.getView().addDependent(oDialog);
					oDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
					oDialog.setModel(pViewModel, "pViewModel");
					oDialog.open(sDialogTab);
				}.bind(this));
			} else {

				this.byId("filter").setModel(pViewModel, "pViewModel");
				this.byId("filter").open(sDialogTab);
			}
		},*/

		onReset: function (oEvent) {
			this.getView().byId("wh").setSelectedKey("");
			this.getView().byId("wh2").setSelectedKey("");
			this.getView().byId("prodCat").setSelectedKey("");
			this.getView().byId("prodCat2").setSelectedKey("");
			this.getView().byId("brand").setSelectedKey("");
			this.getView().byId("brand2").setSelectedKey("");
			this.getView().byId("searchField").setValue("");
			this.getView().byId("searchField2").setValue("");
			this.getView().byId("searchField3").setValue("");
			this.getView().byId("addProductButton").setEnabled(false);
			this.getView().byId("multiPricing").setEnabled(false);
			this.getView().byId("submitButton").setEnabled(false);
			var oModel = new JSONModel(this.warehouses);
			this.byId("wh").setModel(oModel, "warehouses");
			this.byId("wh2").setModel(oModel, "warehouses");
			var localData = this.productCategory();
			var lModel = new JSONModel(localData);
			this.getView().setModel(lModel, "local");
			this.getView().byId("prodCat").setModel(lModel, "local");
			this.getView().byId("prodCat2").setModel(lModel, "local");
			this.getView().getModel("brandModel").setProperty("/allChannel", this.allSalesChnl);
			var oTable = this.getView().byId("list");
			oTable.removeAllItems();
			oTable.removeAllColumns();
			var oTable2 = this.getView().byId("list2");
			oTable2.removeAllItems();
			this.selectedChannel = "";
			this.selectedCat = "";
			this.selectedWH = "";
			this.globalSearchField = "";
			this.globalSearchValue = "";
			if (this.sortDialog) {
				this.sortDialog.destroy();
				delete this.sortDialog;
			}
			this.getView().byId("sortButton").setEnabled(false);
			this.getView().byId("sortButton2").setEnabled(false);
		},

		getTimeZone: function () {
			var timeOffSet = "";
			var that = this;
			$.ajax({
				url: "pricing/GetTimeZone.xsjs",
				contentType: "application/json",
				type: 'GET',
				dataType: "json",
				async: false,
				success: function (response) {
					timeOffSet = response;
					that.timeOffSet = response;
					return response;
				},
				error: function (error) {
					sap.ui.getCore().busyIndicator.close();
				}
			});
			return timeOffSet;
		},

		sortGridMeta: function (objA, objB) {
			var href = document.location.href;
			if (href.includes("AddProduct")) {
				if (objA['ADD_PRODUCT_SORT_ORDER__C'] === undefined || objB['ADD_PRODUCT_SORT_ORDER__C'] === undefined) return 1;
				var objectA = objA['ADD_PRODUCT_SORT_ORDER__C'];
				var objectB = objB['ADD_PRODUCT_SORT_ORDER__C'];
				if (objectA == undefined || objectB == undefined) return 0;
				else return objectA - objectB;
			} else {
				if (objA['PRIMARY_DISPLAY_ORDER__C'] === undefined || objB['PRIMARY_DISPLAY_ORDER__C'] === undefined) return 1;
				var objectA = objA['PRIMARY_DISPLAY_ORDER__C'];
				var objectB = objB['PRIMARY_DISPLAY_ORDER__C'];
				if (objectA == undefined || objectB == undefined) return 0;
				else return objectA - objectB;
			}
		},

		getAccountDetails: function (accNo) {
			$.ajax({
				url: "pricing/GetAccountName.xsjs?Accountno=" + accNo + "&$format=json",
				contentType: "application/json",
				type: 'GET',
				dataType: "json",
				async: false,
				success: function (response) {
					var accDetails = response.results[0];
					sap.ui.getCore().getModel("configModel").setProperty("/accDetails", accDetails);
				},
				error: function (error) {}
			});
		},

		SortByName: function (data) {
			// sort by name
			data.sort(function (a, b) {
				var nameA = a.NAME.toUpperCase(); // ignore upper and lowercase
				var nameB = b.NAME.toUpperCase(); // ignore upper and lowercase
				if (nameA < nameB) {
					return -1;
				}
				if (nameA > nameB) {
					return 1;
				}
				// names must be equal
				return 0;
			});
		},

		/**
		 * Event handler for the filter, sort and group buttons to open the ViewSettingsDialog.
		 * @param {sap.ui.base.Event} oEvent the button press event
		 * @public
		 */
		/* Sort Functionality */
		onSortDialog: function (oEvent) {
			var sDialogTab = "sort";

			var href = document.location.href;
			if (href.includes("AddProduct")) {
				var headerData = sap.ui.getCore().getModel("configModel").getProperty("/apHeader");
			} else {
				var headerData = sap.ui.getCore().getModel("configModel").getProperty("/mHeader");
			}

			// load asynchronous XML fragment
			this.sortDialog = sap.ui.xmlfragment("cf.cpl.fragments.ViewSettingsDialog", this);
			this.getView().addDependent(this.sortDialog);
			for (var i = 0; i < headerData.length; i++) {
				if (headerData[i].header !== "") {
					headerData[i].field = headerData[i].field.includes("PRODUCT__R.") ? headerData[i].field.replace("PRODUCT__R.", "") :
						headerData[
							i]
						.field;
					var oCustomSortItem = new sap.m.ViewSettingsItem({
						key: headerData[i].field,
						text: headerData[i].header
					});
					this.sortDialog.addSortItem(oCustomSortItem);
				}
			}

			if (Device.system.desktop) {
				this.sortDialog.addStyleClass("sapUiSizeCompact");
			}
			this.sortDialog.open();
		},

		//Added by Diksha - story 3999 //
		onSortDialogForPhone: function (oEvent) {

			var sDialogTab = "sort";
			this.getView().getModel("listModel");

			var headerDataMobile = sap.ui.getCore().getModel("configModelMobile").getProperty("/mPhoneHeader");
			var oList2 = this.getView().byId("list2");
			//	var oModelCat = sap.ui.getCore().getModel("configModel");

			// load asynchronous XML fragment
			if (!this.sortDialog) {
				this.sortDialog = sap.ui.xmlfragment("cf.cpl.fragments.ViewSettingsDialog", this);
				this.getView().addDependent(this.sortDialog);
				//	debugger;

				if (this.selectedCat === "Residential Broadloom" || this.selectedCat === "Commercial Broadloom") {
					var items = [{

							"key": "Sell#",
							"text": "Sell #"
						}, {
							"key": "SellingStyle",
							"text": "Selling Style"
						}, {
							"key": "Brand",
							"text": "Brand"
						}, {
							"key": "text",
							"text": "Bill Roll"
						}, {
							"key": "BillCut",
							"text": "Bill Cut"
						},

					];
				} else if (this.selectedCat === "Resilient Sheet") {
					var items = [{

							"key": "Sell#",
							"text": "Sell #"
						}, {
							"key": "SellingStyle",
							"text": "Selling Style"
						}, {
							"key": "Level",
							"text": "Level"
						}, {
							"key": "text",
							"text": "Bill Roll"
						}, {
							"key": "BillCut",
							"text": "Bill Cut"
						},

					];
				} else if (this.selectedCat === "Carpet Tile") {
					var items = [{
							"key": "Sell#",
							"text": "Sell #"
						}, {
							"key": "SellingStyle",
							"text": "Selling Style"
						}, {
							"key": "Brand",
							"text": "Brand"
						}, {
							"key": "Weight",
							"text": "Weight"
						}, {
							"key": "BillCut",
							"text": "Bill Price"
						}

					];
				} else if (this.selectedCat === "SolidWood" || this.selectedCat === "TecWood" || this.selectedCat === "RevWood" ||
					this.selectedCat === "Tile" || this.selectedCat === "Resilient Tile" || this.selectedCat === "Accessories") {
					var items = [{
							"key": "Sell#",
							"text": "Sell #"
						}, {
							"key": "SellingStyle",
							"text": "Selling Style"
						}, {
							"key": "Brand",
							"text": "Brand"
						}, {
							"key": "BillCut",
							"text": "Bill Price"
						}, {
							"key": "Level",
							"text": "Level"
						}

					];
				} else if (this.selectedCat === "Cushion") {
					var items = [{
							"key": "Sell#",
							"text": "Sell#"
						}, {
							"key": "SellingStyle",
							"text": "Selling Style"
						}, {
							"key": "BillCut",
							"text": "Bill Price"
						}, {
							"key": "Level",
							"text": "Level"
						},

					];
				}

				for (var i = 0; i < items.length; i++) {
					var oCustomSortItem = new sap.m.ViewSettingsItem({
						key: items[i].key,
						text: items[i].text
					});
					this.sortDialog.addSortItem(oCustomSortItem);
				}

			}
			this.sortDialog.open();
		},

		//End by Diksha - story 3999 //

		handleConfirm: function (oEvent) {
			/*	var href = document.location.href;
				if (href.includes("AddProduct")) {
					var oTable = this.byId("productList");
				} else {
					var oTable = this.byId("list");
				}*/
			//Added by Diksha -story 3999 //	
			if (Device.system.phone) {
				var oTable = this.byId("list2");
			} else {
				var href = document.location.href;
				if (href.includes("AddProduct")) {
					var oTable = this.byId("productList");
				} else if (href.includes("MultiEdit")) {
					var oTable = this.byId("meList");
				} else {
					var oTable = this.byId("list");
				}

			}

			//End by Diksha - story 3999 //

			var mParams = oEvent.getParameters(),
				oBinding = oTable.getBinding("items"),
				sPath,
				bDescending,
				aSorters = [];

			sPath = mParams.sortItem.getKey();
			bDescending = mParams.sortDescending;
			aSorters.push(new Sorter(sPath, bDescending));

			// apply the selected sort and group settings
			oBinding.sort(aSorters);
		},

		// Justification Popup
		OnCancelJustification: function (oEvent) {
			this._oDialogJustification.close();
			// this._oDialogJustification.destroy();
		},

		afterCloseJustifcation: function () {
			if (this._oDialogJustification) {
				this._oDialogJustification.destroy();
				this._oDialogJustification = null;
			}
		},

		fetchProducts: function () {
			var brand = sap.ui.getCore().getModel("configModel").getProperty("/allBrand");
			// var brand = this.byId("brand").getModel("brandModel").getProperty("/allBrand");
			if (brand === undefined) {
				var brand = this.byId("brand2").getModel("brandModel").getProperty("/allBrand");
			}

			this.globalSearch = false;

			if (this.selectedChannel !== "" && this.selectedChannel !== null && this.selectedChannel !== undefined && this.selectedCat !==
				undefined && this.selectedWH !== undefined && this.selectedWH !== null) {
				this.filteredBrand = [];
				for (var i = 0; i < brand.length; i++) {
					if (brand[i].SALES_CHANNEL__C === this.selectedChannel) {
						this.filteredBrand.push(brand[i]);
					}
				}

				var localData = this.getOwnerComponent().getModel("local").getData();

				var that = this;
				// var pViewModel = new JSONModel();
				var href = document.location.href;
				if (href.includes("MultiEdit")) {
					var meViewModel = sap.ui.getCore().getModel("meViewModel");
					meViewModel.setSizeLimit(10000);
				} else {
					var pViewModel = this.getView().getModel("pViewModel");
					pViewModel.setSizeLimit(10000);
				}

				var urlBrand = "";

				for (var i = 0; i < this.filteredBrand.length; i++) {
					if (i === 0) {
						urlBrand = urlBrand + "and (BRAND_CODE__C eq '" + this.filteredBrand[i].BRAND_CODE__C + "' ";
					} else {
						urlBrand = urlBrand + "or BRAND_CODE__C eq '" + this.filteredBrand[i].BRAND_CODE__C + "' ";
					}
				}

				var viewName = "";

				if (this.selectedCat === "Commercial Broadloom") {
					viewName = "CPLCommercialBroadloomView";
				} else if (this.selectedCat === "Accessories") {
					viewName = "CPLAccessoriesView";
				} else if (this.selectedCat === "Carpet Tile") {
					viewName = "CPLCarpetTileView";
				} else if (this.selectedCat === "Cushion") {
					viewName = "CPLCushionView";
				} else if (this.selectedCat === "Residential Broadloom") {
					viewName = "CPLResidentialBroadloomView";
				} else if (this.selectedCat === "Resilient Tile") {
					viewName = "CPLResilientTileView";
				} else if (this.selectedCat === "Resilient Sheet") {
					viewName = "CPLResilientSheetView";
				} else if (this.selectedCat === "RevWood") {
					viewName = "CPLRevWoodView";
				} else if (this.selectedCat === "SolidWood") {
					viewName = "CPLSolidWoodView";
				} else if (this.selectedCat === "TecWood") {
					viewName = "CPLTecWoodView";
				} else if (this.selectedCat === "Tile") {
					viewName = "CPLTileView";
				}
				if (this.accNo === "" || this.accNo === undefined) {
					if (this.globalSearchValue !== "" && this.globalSearchValue !== undefined) {
						var url = "pricing/" + viewName + ".xsjs?Whcode=" + this.selectedWH + "&accountNo1=NA&accountNo2=NA&Brandcode=" + this.selectedChannel +
							"&globalsearchKey=" + this.globalSearchValue + "&limit=" + this.fetchTotal + "&from=" + this.fetchSkip + "&$format=json";
					} else {
						/*	var url = "pricing/PriceGrid.xsodata/" + viewName + "?$filter=WAREHOUSE_CODE__C eq '" +
								this.selectedWH + "' " + urlBrand + ")&$skip=" + this.fetchSkip + "&$top=" + this.fetchTotal + "&$format=json";*/
						if (this.getBlackProduct === false) {
							var url = "pricing/PriceGrid.xsodata/" + viewName + "?$filter=WAREHOUSE_CODE__C eq '" +
								this.selectedWH + "' " + urlBrand +
								") and (APPROVAL_STATUS__C eq '1' or APPROVAL_STATUS__C eq '2' or APPROVAL_STATUS__C eq '3' or APPROVAL_STATUS__C eq '4' or APPROVAL_STATUS__C eq 'A' or APPROVAL_STATUS__C eq 'F') and MODIFIED_BY__C eq '" +
								this.loggedInUser + "'&$skip=" + this.fetchSkip + "&$top=" + this.fetchTotal + "&$format=json";
						} else {
							var url = "pricing/PriceGrid.xsodata/" + viewName + "?$filter=WAREHOUSE_CODE__C eq '" +
								this.selectedWH + "' " + urlBrand +
								") and ((APPROVAL_STATUS__C eq '1' and APPROVAL_STATUS__C eq '2' and APPROVAL_STATUS__C eq '3' and APPROVAL_STATUS__C eq '4' and APPROVAL_STATUS__C eq 'A' and APPROVAL_STATUS__C eq 'F' and MODIFIED_BY__C ne '" +
								this.loggedInUser +
								"') or  (APPROVAL_STATUS__C ne '1' and APPROVAL_STATUS__C ne '2' and APPROVAL_STATUS__C ne '3' and APPROVAL_STATUS__C ne '4' and APPROVAL_STATUS__C ne 'A' and APPROVAL_STATUS__C ne 'F'))&$skip=" +
								this.fetchSkip + "&$top=" + this.fetchTotal + "&$format=json";
						}
					}
				} else {
					if (this.accNo.split(".")[2] !== "0000") {
						this.preAcc = this.accNo.replace(this.accNo.split(".")[2], "0000");
						if (this.globalSearchValue !== "" && this.globalSearchValue !== undefined) {
							var url = "pricing/" + viewName + ".xsjs?Whcode=" + this.selectedWH + "&accountNo1=" + this.accNo + "&accountNo2=" + this.preAcc +
								"&Brandcode=" + this.selectedChannel +
								"&globalsearchKey=" + this.globalSearchValue + "&limit=" + this.fetchTotal + "&from=" + this.fetchSkip + "&$format=json";
						} else {
							/*var url = "pricing/PriceGrid.xsodata/" + viewName + "?$filter=ACCOUNT__C eq '" + this.accNo + "' or ACCOUNT__C eq '" +
								this.preAcc + "' and WAREHOUSE_CODE__C eq '" +
								this.selectedWH + "' " + urlBrand + ")&$skip=" + this.fetchSkip + "&$top=" + this.fetchTotal + "&$format=json";*/
							if (this.getBlackProduct === false) {
								var url = "pricing/PriceGrid.xsodata/" + viewName + "?$filter=ACCOUNT__C eq '" + this.accNo + "' or ACCOUNT__C eq '" +
									this.preAcc + "' and WAREHOUSE_CODE__C eq '" +
									this.selectedWH + "' " + urlBrand +
									") and (APPROVAL_STATUS__C eq '1' or APPROVAL_STATUS__C eq '2' or APPROVAL_STATUS__C eq '3' or APPROVAL_STATUS__C eq '4' or APPROVAL_STATUS__C eq 'A' or APPROVAL_STATUS__C eq 'F') and MODIFIED_BY__C eq '" +
									this.loggedInUser + "'&$skip=" + this.fetchSkip + "&$top=" + this.fetchTotal + "&$format=json";
							} else {
								var url = "pricing/PriceGrid.xsodata/" + viewName + "?$filter=ACCOUNT__C eq '" + this.accNo + "' or ACCOUNT__C eq '" +
									this.preAcc + "' and WAREHOUSE_CODE__C eq '" +
									this.selectedWH + "' " + urlBrand +
									") and ((APPROVAL_STATUS__C eq '1' and APPROVAL_STATUS__C eq '2' and APPROVAL_STATUS__C eq '3' and APPROVAL_STATUS__C eq '4' and APPROVAL_STATUS__C eq 'A' and APPROVAL_STATUS__C eq 'F' and MODIFIED_BY__C ne '" +
									this.loggedInUser +
									"') or  (APPROVAL_STATUS__C ne '1' and APPROVAL_STATUS__C ne '2' and APPROVAL_STATUS__C ne '3' and APPROVAL_STATUS__C ne '4' and APPROVAL_STATUS__C ne 'A' and APPROVAL_STATUS__C ne 'F'))&$skip=" +
									this.fetchSkip + "&$top=" + this.fetchTotal + "&$format=json";
							}
						}
					} else {
						if (this.globalSearchValue !== "" && this.globalSearchValue !== undefined) {
							var url = "pricing/" + viewName + ".xsjs?Whcode=" + this.selectedWH + "&accountNo1=" + this.accNo + "&accountNo2=NA&Brandcode=" +
								this.selectedChannel +
								"&globalsearchKey=" + this.globalSearchValue + "&limit=" + this.fetchTotal + "&from=" + this.fetchSkip + "&$format=json";
						} else {
							/*var url = "pricing/PriceGrid.xsodata/" + viewName + "?$filter=ACCOUNT__C eq '" + this.accNo +
								"' and WAREHOUSE_CODE__C eq '" +
								this.selectedWH + "' " + urlBrand + ")&$skip=" + this.fetchSkip + "&$top=" + this.fetchTotal + "&$format=json";*/
							if (this.getBlackProduct === false) {
								var url = "pricing/PriceGrid.xsodata/" + viewName + "?$filter=ACCOUNT__C eq '" + this.accNo +
									"' and WAREHOUSE_CODE__C eq '" +
									this.selectedWH + "' " + urlBrand +
									") and (APPROVAL_STATUS__C eq '1' or APPROVAL_STATUS__C eq '2' or APPROVAL_STATUS__C eq '3' or APPROVAL_STATUS__C eq '4' or APPROVAL_STATUS__C eq 'A' or APPROVAL_STATUS__C eq 'F') and MODIFIED_BY__C eq '" +
									this.loggedInUser + "'&$skip=" + this.fetchSkip + "&$top=" + this.fetchTotal + "&$format=json";
							} else {
								var url = "pricing/PriceGrid.xsodata/" + viewName + "?$filter=ACCOUNT__C eq '" + this.accNo +
									"' and WAREHOUSE_CODE__C eq '" +
									this.selectedWH + "' " + urlBrand +
									") and ((APPROVAL_STATUS__C eq '1' and APPROVAL_STATUS__C eq '2' and APPROVAL_STATUS__C eq '3' and APPROVAL_STATUS__C eq '4' and APPROVAL_STATUS__C eq 'A' and APPROVAL_STATUS__C eq 'F' and MODIFIED_BY__C ne '" +
									this.loggedInUser +
									"') or  (APPROVAL_STATUS__C ne '1' and APPROVAL_STATUS__C ne '2' and APPROVAL_STATUS__C ne '3' and APPROVAL_STATUS__C ne '4' and APPROVAL_STATUS__C ne 'A' and APPROVAL_STATUS__C ne 'F'))&$skip=" +
									this.fetchSkip + "&$top=" + this.fetchTotal + "&$format=json";
							}
						}
					}
				}

				if (this.selectedWH !== undefined & this.selectedWH !== "" & this.selectedChannel !== undefined & this.selectedChannel !== "" &
					this.selectedCat !== undefined & this.selectedCat !== "") {
					sap.ui.getCore().busyIndicator.open();
					$.ajax({
						url: url,
						contentType: "application/json",
						type: 'GET',
						dataType: "json",
						async: false,
						success: function (response) {
							// console.log(response.d.results);
							var data;
							if (response.d) {
								data = response.d.results;
							} else {
								data = response.results;
							}
							/*if (data.length < this.fetchTotal) {
								this.endResult = true;
							} else {
								this.endResult = false;
							}*/
							if (that.mainData.length > 0) {
								that.mainData = that.mainData.concat(data);
							} else {
								that.mainData = data;
							}
							// that.mainData.push(data);
							if (data.length < that.fetchTotal) {
								if (that.getBlackProduct === true) {
									that.completeResult = true;
									that.getBlackProduct = false;
								} else {
									that.getBlackProduct = true;
									that.endResult = true;
								}
							} else {
								if (that.getBlackProduct === false && (that.globalSearchValue === "" || that.globalSearchValue === undefined)) {
									that.fetchProducts();
								} else {
									that.getBlackProduct = false;
									that.endResult = false;
								}
							}

							if (that.getBlackProduct === true && that.endResult === true && (that.globalSearchValue === "" || that.globalSearchValue === undefined)) {
								that.fetchProducts();
							}
							
							if(that.mainData.length > 0) {
								that._afterFetchProduct(that.mainData);
							} else {
								sap.ui.getCore().busyIndicator.close();
							}

						},
						error: function (error) {
							console.log(error);
							var href = document.location.href;
							if (!href.includes("MultiEdit")) {
								that.getView().byId("sortButton").setEnabled(false);
								that.getView().byId("sortButton2").setEnabled(false);
							}

							sap.ui.getCore().busyIndicator.close();
						}
					});
				}

			}
		},

		_afterFetchProduct: function (data) {
			var href = document.location.href;
			if (href.includes("MultiEdit")) {
				var meViewModel = sap.ui.getCore().getModel("meViewModel");
				meViewModel.setSizeLimit(10000);
			} else {
				var pViewModel = this.getView().getModel("pViewModel");
				pViewModel.setSizeLimit(10000);
			}

			data = data.filter(function (c) {
				var endDate = 0;
				if (c.END_DATE__C !== null) {
					if (c.END_DATE__C.split("(").length > 1) {
						endDate = parseFloat(c.END_DATE__C.split("(")[1].split(")")[0]);
					} else {
						endDate = parseFloat(new Date(c.END_DATE__C).getTime());
					}
					// var currDate = new Date().getTime();
					// return endDate > currDate;
					function addZero(c) {
						if (c.length < 2) {
							c = 0 + c;
						}
						return c;
					}
					var endDay = new Date(endDate).getFullYear().toString() + addZero(new Date(endDate).getMonth().toString()) + addZero(new Date(
						endDate).getDate().toString());
					var currDay = new Date().getFullYear().toString() + addZero(new Date().getMonth().toString()) + addZero(new Date().getDate()
						.toString());
					return parseFloat(endDay) >= parseFloat(currDay);
				}

			});

			// pViewModel.setData(data);
			// var pViewData = data;
			var pViewData = "";
			var concatDataFlag = sap.ui.getCore().getModel("configModel").getProperty("/concatDataFlag");
			var href = document.location.href;
			if (href.includes("MultiEdit")) {
				if (meViewModel.getData() !== undefined && meViewModel.getData().length > 0 && concatDataFlag === false) {
					pViewData = meViewModel.getData().concat(data);
				} else {
					pViewData = data;
				}
			} else {
				if (pViewModel.getData() !== undefined && pViewModel.getData().length > 0 && concatDataFlag === false) {
					pViewData = pViewModel.getData().concat(data);
				} else {
					pViewData = data;
				}
			}
			// var offset = +5.5;
			// var timeZone = this.getTimeZone();
			var timeZone = sap.ui.getCore().getModel("configModel").getProperty("/timeOffSet");
			var offset = timeZone / 60;
			for (var i = 0; i < pViewData.length; i++) {

				pViewData[i].SELLING_STYLE_CONCAT__C = pViewData[i].PRODUCT_NAME__C + "(" + pViewData[i].PRODUCT_STYLE_NUMBER__C + ")";
				// pViewData[i].NAME = pViewData[i].PRODUCT_NAME__C + "(" + pViewData[i].SELLING_STYLE_NUM__C + ")";
				pViewData[i].NAME = pViewData[i].PRODUCT_NAME__C; // modified because of change request by client
				pViewData[i].MASTER_STYLE_CONCAT__C = pViewData[i].MASTER_STYLE_NAME__C + "(" + pViewData[i].MASTER_STYLE_NUM__C + ")";
				pViewData[i].INVENTORY_STYLE_CONCAT__C = pViewData[i].INVENTORY_STYLE_NAME__C + "(" + pViewData[i].INVENTORY_STYLE_NUM__C +
					")";
				pViewData[i].TM3_PRICE_CONCAT__C = pViewData[i].INVENTORY_STYLE_NAME__C + "(" + pViewData[i].INVENTORY_STYLE_NUM__C + ")";

				pViewData[i].INFORMATION = "";

				pViewData[i].EDIT_START_DATE = pViewData[i].START_DATE__C;
				pViewData[i].EDIT_END_DATE = pViewData[i].END_DATE__C;

				if (pViewData[i].START_DATE__C.split("(").length > 1) {
					var clientStartDate = new Date(parseFloat(pViewData[i].START_DATE__C.split("(")[1].split(")")[0]));
				} else {
					var clientStartDate = new Date(parseFloat(new Date(pViewData[i].START_DATE__C).getTime()));
				}
				var utcStart = clientStartDate.getTime() + (clientStartDate.getTimezoneOffset() * 60000);
				var modifiedStart = new Date(utcStart + (3600000 * offset));
				pViewData[i].START_DATE__C = "/Date(" + modifiedStart.getTime() + ")/";

				if (pViewData[i].END_DATE__C.split("(").length > 1) {
					var clientEndDate = new Date(parseFloat(pViewData[i].END_DATE__C.split("(")[1].split(")")[0]));
				} else {
					var clientEndDate = new Date(parseFloat(new Date(pViewData[i].END_DATE__C).getTime()));
				}

				var utcEnd = clientEndDate.getTime() + (clientEndDate.getTimezoneOffset() * 60000);
				var modifiedEnd = new Date(utcEnd + (3600000 * offset));
				pViewData[i].END_DATE__C = "/Date(" + modifiedEnd.getTime() + ")/";

				if (parseFloat(pViewData[i].CUTS_AT_ROLL__C) > 0) {
					pViewData[i].INFORMATION += " C";
				}
				if (pViewData[i].ACCOUNT__C === this.preAcc) {
					pViewData[i].INFORMATION += " I";
				}
				if (pViewData[i].BUYING_GROUP_PRICE__C === "X") {
					pViewData[i].INFORMATION += " G";
				}
				if (pViewData[i].MIN_ORDER_QTY__C === "X") {
					pViewData[i].INFORMATION += " Q";
				}
				if (this.selectedCat === "Commercial Broadloom" || this.selectedCat === "Residential Broadloom") {
					if (parseFloat(pViewData[i].BILLING_PRICE_ROLL__C) !== parseFloat(pViewData[i].NET_PRICE_ROLL__C) && parseFloat(pViewData[
							i].BILLING_PRICE_CUT__C) !==
						parseFloat(pViewData[i].NET_PRICE_CUT__C)) {
						pViewData[i].INFORMATION += " $";
					}
				} else {
					if (parseFloat(pViewData[i].BILLING_PRICE__C) !== parseFloat(pViewData[i].NET_PRICE__C)) {
						pViewData[i].INFORMATION += " $";
					}
				}

				//Change of 26-11-2020 for Edit record

				pViewData[i].EDIT_START_DATE = pViewData[i].START_DATE__C;
				pViewData[i].EDIT_END_DATE = pViewData[i].END_DATE__C;

				// chanages for modiefied bill price / bill roll / bill cut rpice 
				if (pViewData[i].BILLING_PRICE__C !== null || pViewData[i].BILLING_PRICE__C !== undefined) {
					if ((pViewData[i].APPROVAL_STATUS__C === "1" || pViewData[i].APPROVAL_STATUS__C === "2" || pViewData[i].APPROVAL_STATUS__C ===
							"3" || pViewData[i].APPROVAL_STATUS__C === "A" || pViewData[i].APPROVAL_STATUS__C === "F") && pViewData[i].MODIFIED_BY__C ===
						this.loggedInUser && this.selectedCat == "Accessories") {
						pViewData[i].BILLING_PRICE__C = pViewData[i].REQUESTED_BILLING_PRICE__C;
					} else {
						pViewData[i].BILLING_PRICE__C = pViewData[i].BILLING_PRICE__C;
					}
					if ((pViewData[i].APPROVAL_STATUS__C === "1" || pViewData[i].APPROVAL_STATUS__C === "2" || pViewData[i].APPROVAL_STATUS__C ===
							"3" || pViewData[i].APPROVAL_STATUS__C === "A" || pViewData[i].APPROVAL_STATUS__C === "F") && pViewData[i].MODIFIED_BY__C ===
						this.loggedInUser && (this.selectedCat === "RevWood" || this.selectedCat === "SolidWood" || this.selectedCat ===
							"TecWood" || this.selectedCat === "Resilient Tile" || this.selectedCat === "Carpet Tile" || this.selectedCat === "Tile")
					) {
						pViewData[i].BILLING_PRICE__C = pViewData[i].REQUESTED_BILLING_PRICE_CARTON__C;
					} else {
						pViewData[i].BILLING_PRICE__C = pViewData[i].BILLING_PRICE__C;
					}
					//Added by <JAYANT PRAKASH> for <2269>
					if ((pViewData[i].APPROVAL_STATUS__C === "1" || pViewData[i].APPROVAL_STATUS__C === "2" || pViewData[i].APPROVAL_STATUS__C ===
							"3" || pViewData[i].APPROVAL_STATUS__C === "A" || pViewData[i].APPROVAL_STATUS__C === "F") && pViewData[i].MODIFIED_BY__C ===
						this.loggedInUser && this.selectedCat == "Cushion") {
						pViewData[i].BILLING_PRICE__C = pViewData[i].REQUESTED_BILLING_PRICE__C;
					} else {
						pViewData[i].BILLING_PRICE__C = pViewData[i].BILLING_PRICE__C;
					}
					//Added by <JAYANT PRAKASH> for <2269>
				}

				if (pViewData[i].BILLING_PRICE_ROLL__C !== null || pViewData[i].BILLING_PRICE_ROLL__C !== undefined) {
					if ((pViewData[i].APPROVAL_STATUS__C === "1" || pViewData[i].APPROVAL_STATUS__C === "2" || pViewData[i].APPROVAL_STATUS__C ===
							"3" || pViewData[i].APPROVAL_STATUS__C === "A" || pViewData[i].APPROVAL_STATUS__C === "F") && pViewData[i].MODIFIED_BY__C ===
						this.loggedInUser) {
						pViewData[i].BILLING_PRICE_ROLL__C = pViewData[i].REQUESTED_BILLING_PRICE_ROLL__C;
					} else {
						pViewData[i].BILLING_PRICE_ROLL__C = pViewData[i].BILLING_PRICE_ROLL__C;
					}
				}

				if (pViewData[i].BILLING_PRICE_CUT__C !== null || pViewData[i].BILLING_PRICE_CUT__C !== undefined) {
					if ((pViewData[i].APPROVAL_STATUS__C === "1" || pViewData[i].APPROVAL_STATUS__C === "2" || pViewData[i].APPROVAL_STATUS__C ===
							"3" || pViewData[i].APPROVAL_STATUS__C === "A" || pViewData[i].APPROVAL_STATUS__C === "F") && pViewData[i].MODIFIED_BY__C ===
						this.loggedInUser) {
						pViewData[i].BILLING_PRICE_CUT__C = pViewData[i].REQUESTED_BILLING_PRICE_CUT__C;
					} else {
						pViewData[i].BILLING_PRICE_CUT__C = pViewData[i].BILLING_PRICE_CUT__C;
					}
				}
				// chanages for modiefied bill price / bill roll / bill cut rpice 	

				//changes for check created limited price record exist or not
				pViewData[i].ISLIMITEDPRICERECORD = pViewData[i].CPL_PRICE_ID__C.length === 18 ? true : false;
				//changes for check created limited price record exist or not

				pViewData[i].TM1_ROLL_PRICE__C = pViewData[i].TM1_ROLL_PRICE__C !== null ? pViewData[i].TM1_ROLL_PRICE__C : "0";
				pViewData[i].TM2_ROLL_PRICE__C = pViewData[i].TM2_ROLL_PRICE__C !== null ? pViewData[i].TM2_ROLL_PRICE__C : "0";
				pViewData[i].TM3_ROLL_PRICE__C = pViewData[i].TM3_ROLL_PRICE__C !== null ? pViewData[i].TM3_ROLL_PRICE__C : "0";
				pViewData[i].DM_ROLL_PRICE__C = pViewData[i].DM_ROLL_PRICE__C !== null ? pViewData[i].DM_ROLL_PRICE__C : "0";
				pViewData[i].RVP_ROLL_PRICE__C = pViewData[i].RVP_ROLL_PRICE__C !== null ? pViewData[i].RVP_ROLL_PRICE__C : "0";

				pViewData[i].TM1_CUT_PRICE__C = pViewData[i].TM1_CUT_PRICE__C !== null ? pViewData[i].TM1_CUT_PRICE__C : "0";
				pViewData[i].TM2_CUT_PRICE__C = pViewData[i].TM2_CUT_PRICE__C !== null ? pViewData[i].TM2_CUT_PRICE__C : "0";
				pViewData[i].TM3_CUT_PRICE__C = pViewData[i].TM3_CUT_PRICE__C !== null ? pViewData[i].TM3_CUT_PRICE__C : "0";
				pViewData[i].DM_CUT_PRICE__C = pViewData[i].DM_CUT_PRICE__C !== null ? pViewData[i].DM_CUT_PRICE__C : "0";
				pViewData[i].RVP_CUT_PRICE__C = pViewData[i].RVP_CUT_PRICE__C !== null ? pViewData[i].RVP_CUT_PRICE__C : "0";

				pViewData[i].TM_PRICE__C = pViewData[i].TM_PRICE__C !== null ? pViewData[i].TM_PRICE__C : "0";
				pViewData[i].TM2_PRICE__C = pViewData[i].TM2_PRICE__C !== null ? pViewData[i].TM2_PRICE__C : "0";
				pViewData[i].TM3_PRICE__C = pViewData[i].TM3_PRICE__C !== null ? pViewData[i].TM3_PRICE__C : "0";
				pViewData[i].DM_PRICE__C = pViewData[i].DM_PRICE__C !== null ? pViewData[i].DM_PRICE__C : "0";
				pViewData[i].RVP_PRICE__C = pViewData[i].RVP_PRICE__C !== null ? pViewData[i].RVP_PRICE__C : "0";
				pViewData[i].CONTAINER_PRICE__C = pViewData[i].CONTAINER_PRICE__C !== null ? pViewData[i].CONTAINER_PRICE__C : "0";

				if (pViewData[i].BILLING_PRICE_ROLL__C === null) {
					pViewData[i].PRICE_LEVEL_ROLL__C = "N/A";
				} else if (pViewData[i].BILLING_PRICE_ROLL__C) { // added condition for Buyers group fields - Pratik - 30/10
					if (pViewData[i].BUYING_GROUP__C !== null && pViewData[i].BUYING_GROUP__C !== "" && pViewData[i].BUYING_GROUP_NUMBER__C !==
						null && pViewData[i].BUYING_GROUP_NUMBER__C !==
						""
					) {
						if (parseFloat(pViewData[i].BILLING_PRICE_ROLL__C) > parseFloat(pViewData[i].GROUP_ROLL_PRICE__C)) {
							pViewData[i].PRICE_LEVEL_ROLL__C = "> BG";
						} else if (parseFloat(pViewData[i].BILLING_PRICE_ROLL__C) == parseFloat(pViewData[i].GROUP_ROLL_PRICE__C)) {
							pViewData[i].PRICE_LEVEL_ROLL__C = "= BG";
						} else if (parseFloat(pViewData[i].BILLING_PRICE_ROLL__C) < parseFloat(pViewData[i].GROUP_ROLL_PRICE__C)) {
							pViewData[i].PRICE_LEVEL_ROLL__C = "< BG";
						} else if (pViewData[i].BILLING_PRICE_ROLL__C === "0.00" || pViewData[i].BILLING_PRICE_ROLL__C === null || pViewData[i].GROUP_ROLL_PRICE__C ===
							null) {
							pViewData[i].PRICE_LEVEL_ROLL__C = "N/A";
						}
					} else {
						if (pViewData[i].PRICE_GRID_UNIQUE_KEY__C === null) {
							pViewData[i].PRICE_LEVEL_ROLL__C = "N/A";
						} else if (pViewData[i].BILLING_PRICE_ROLL__C === "0" && pViewData[i].TM1_ROLL_PRICE__C === "0" && pViewData[i].TM2_ROLL_PRICE__C ===
							"0" && pViewData[i].TM3_ROLL_PRICE__C === "0" && pViewData[i].DM_ROLL_PRICE__C === "0" && pViewData[i].RVP_ROLL_PRICE__C ===
							"0") {
							pViewData[i].PRICE_LEVEL_ROLL__C = "N/A";
						} else if (parseFloat(pViewData[i].BILLING_PRICE_ROLL__C) > parseFloat(pViewData[i].TM1_ROLL_PRICE__C)) {
							pViewData[i].PRICE_LEVEL_ROLL__C = "> TM1";
						} else if ((parseFloat(pViewData[i].BILLING_PRICE_ROLL__C) == parseFloat(pViewData[i].TM1_ROLL_PRICE__C)) &&
							(parseFloat(pViewData[i].BILLING_PRICE_ROLL__C) == parseFloat(pViewData[i].TM2_ROLL_PRICE__C)) && (parseFloat(pViewData[
								i].BILLING_PRICE_ROLL__C) == parseFloat(pViewData[i].TM3_ROLL_PRICE__C))) {
							pViewData[i].PRICE_LEVEL_ROLL__C = "TM1/TM2/TM3";
						} else if (parseFloat(pViewData[i].BILLING_PRICE_ROLL__C) == parseFloat(pViewData[i].TM1_ROLL_PRICE__C)) {
							pViewData[i].PRICE_LEVEL_ROLL__C = "TM1";
						} else if ((parseFloat(pViewData[i].BILLING_PRICE_ROLL__C) < parseFloat(pViewData[i].TM1_ROLL_PRICE__C)) && (parseFloat(
								pViewData[i].BILLING_PRICE_ROLL__C) >= parseFloat(pViewData[i].TM2_ROLL_PRICE__C))) {
							pViewData[i].PRICE_LEVEL_ROLL__C = "TM2";
						} else if ((parseFloat(pViewData[i].BILLING_PRICE_ROLL__C) < parseFloat(pViewData[i].TM2_ROLL_PRICE__C)) && (parseFloat(
								pViewData[i].BILLING_PRICE_ROLL__C) >= parseFloat(pViewData[i].TM3_ROLL_PRICE__C))) {
							pViewData[i].PRICE_LEVEL_ROLL__C = "TM3";
						} else if ((parseFloat(pViewData[i].BILLING_PRICE_ROLL__C) < parseFloat(pViewData[i].TM3_ROLL_PRICE__C)) && (parseFloat(
								pViewData[i].BILLING_PRICE_ROLL__C) >= parseFloat(pViewData[i].DM_ROLL_PRICE__C))) {
							pViewData[i].PRICE_LEVEL_ROLL__C = "DM";
						} else if ((parseFloat(pViewData[i].BILLING_PRICE_ROLL__C) < parseFloat(pViewData[i].DM_ROLL_PRICE__C)) && (parseFloat(
								pViewData[i].BILLING_PRICE_ROLL__C) >= parseFloat(pViewData[i].RVP_ROLL_PRICE__C))) {
							pViewData[i].PRICE_LEVEL_ROLL__C = "RVP";
						} else if (parseFloat(pViewData[i].BILLING_PRICE_ROLL__C) < parseFloat(pViewData[i].RVP_ROLL_PRICE__C)) {
							pViewData[i].PRICE_LEVEL_ROLL__C = "< RVP";
						}

					}

				}

				if (pViewData[i].BILLING_PRICE_CUT__C === null) {
					pViewData[i].PRICE_LEVEL_CUT__C = "N/A";
				} else if (pViewData[i].BILLING_PRICE_CUT__C) { // added condition for Buyers group fields - Pratik - 30/10
					if (pViewData[i].BUYING_GROUP__C !== null && pViewData[i].BUYING_GROUP__C !== "" && pViewData[i].BUYING_GROUP_NUMBER__C !==
						null && pViewData[i].BUYING_GROUP_NUMBER__C !==
						""
					) {
						if (parseFloat(pViewData[i].BILLING_PRICE_CUT__C) > parseFloat(pViewData[i].GROUP_CUT_PRICE__C)) {
							pViewData[i].PRICE_LEVEL_CUT__C = "> BG";
						} else if (parseFloat(pViewData[i].BILLING_PRICE_CUT__C) == parseFloat(pViewData[i].GROUP_CUT_PRICE__C)) {
							pViewData[i].PRICE_LEVEL_CUT__C = "= BG";
						} else if (parseFloat(pViewData[i].BILLING_PRICE_CUT__C) < parseFloat(pViewData[i].GROUP_CUT_PRICE__C)) {
							pViewData[i].PRICE_LEVEL_CUT__C = "< BG";
						} else if (pViewData[i].BILLING_PRICE_CUT__C === "0.00" || pViewData[i].BILLING_PRICE_CUT__C === null || pViewData[i].GROUP_CUT_PRICE__C ===
							null) {
							pViewData[i].PRICE_LEVEL_CUT__C = "N/A";
						}
					} else {
						if (pViewData[i].PRICE_GRID_UNIQUE_KEY__C === null) {
							pViewData[i].PRICE_LEVEL_CUT__C = "N/A";
						} //Added 0.00 instead of 0 by <JAYANT PRAKASH> for <4532>.
						else if (pViewData[i].BILLING_PRICE_CUT__C === "0.00" && pViewData[i].TM1_CUT_PRICE__C === "0.00" && pViewData[i].TM2_CUT_PRICE__C ===
							"0.00" && pViewData[i].TM3_CUT_PRICE__C === "0.00" && pViewData[i].DM_CUT_PRICE__C === "0.00" && pViewData[i].RVP_CUT_PRICE__C ===
							"0.00") {
							pViewData[i].PRICE_LEVEL_CUT__C = "N/A";
						} else if (parseFloat(pViewData[i].BILLING_PRICE_CUT__C) > parseFloat(pViewData[i].TM1_CUT_PRICE__C)) {
							pViewData[i].PRICE_LEVEL_CUT__C = "> TM1";
						} else if ((parseFloat(pViewData[i].BILLING_PRICE_CUT__C) == parseFloat(pViewData[i].TM1_CUT_PRICE__C)) &&
							(parseFloat(pViewData[i].BILLING_PRICE_CUT__C) == parseFloat(pViewData[i].TM2_CUT_PRICE__C)) && (parseFloat(pViewData[i]
								.BILLING_PRICE_CUT__C) == parseFloat(pViewData[i].TM3_CUT_PRICE__C))) {
							pViewData[i].PRICE_LEVEL_CUT__C = "TM1/TM2/TM3";
						} else if (parseFloat(pViewData[i].BILLING_PRICE_CUT__C) == parseFloat(pViewData[i].TM1_CUT_PRICE__C)) {
							pViewData[i].PRICE_LEVEL_CUT__C = "TM1";
						} else if ((parseFloat(pViewData[i].BILLING_PRICE_CUT__C) < parseFloat(pViewData[i].TM1_CUT_PRICE__C)) && (parseFloat(
								pViewData[i].BILLING_PRICE_CUT__C) >= parseFloat(pViewData[i].TM2_CUT_PRICE__C))) {
							pViewData[i].PRICE_LEVEL_CUT__C = "TM2";
						} else if ((parseFloat(pViewData[i].BILLING_PRICE_CUT__C) < parseFloat(pViewData[i].TM2_CUT_PRICE__C)) && (parseFloat(
								pViewData[i].BILLING_PRICE_CUT__C) >= parseFloat(pViewData[i].TM3_CUT_PRICE__C))) {
							pViewData[i].PRICE_LEVEL_CUT__C = "TM3";
						} else if ((parseFloat(pViewData[i].BILLING_PRICE_CUT__C) < parseFloat(pViewData[i].TM3_CUT_PRICE__C)) && (parseFloat(
								pViewData[i].BILLING_PRICE_CUT__C) >= parseFloat(pViewData[i].DM_CUT_PRICE__C))) {
							pViewData[i].PRICE_LEVEL_CUT__C = "DM";
						} else if ((parseFloat(pViewData[i].BILLING_PRICE_CUT__C) < parseFloat(pViewData[i].DM_CUT_PRICE__C)) && (parseFloat(
								pViewData[i].BILLING_PRICE_CUT__C) >= parseFloat(pViewData[i].RVP_CUT_PRICE__C))) {
							pViewData[i].PRICE_LEVEL_CUT__C = "RVP";
						} else if (parseFloat(pViewData[i].BILLING_PRICE_CUT__C) < parseFloat(pViewData[i].RVP_CUT_PRICE__C)) {
							pViewData[i].PRICE_LEVEL_CUT__C = "< RVP";
						}

					}

				}

				if (pViewData[i].BILLING_PRICE__C === null) {
					pViewData[i].PRICE_LEVEL__C = "N/A";
				} else if (pViewData[i].BILLING_PRICE__C) { // added condition for Buyers group fields - Pratik - 30/10
					//Added by Karan on 03.12.2020 to stop the existing logic for Cushion story 2292 start 
					if (this.selectedCat !== "Cushion") {
						//Added by Karan on 03.12.2020 to stop the existing logic for Cushion story 2292 end
						if (pViewData[i].BUYING_GROUP__C !== null && pViewData[i].BUYING_GROUP__C !== "" && pViewData[i].BUYING_GROUP_NUMBER__C !==
							null && pViewData[i].BUYING_GROUP_NUMBER__C !==
							""
						) {
							if (parseFloat(pViewData[i].BILLING_PRICE__C) > parseFloat(pViewData[i].GROUP_PRICE__C)) {
								pViewData[i].PRICE_LEVEL__C = "> BG";
							} else if (parseFloat(pViewData[i].BILLING_PRICE__C) == parseFloat(pViewData[i].GROUP_PRICE__C)) {
								pViewData[i].PRICE_LEVEL__C = "= BG";
							} else if (parseFloat(pViewData[i].BILLING_PRICE__C) < parseFloat(pViewData[i].GROUP_PRICE__C)) {
								pViewData[i].PRICE_LEVEL__C = "< BG";
							} else if (pViewData[i].BILLING_PRICE__C === "0.00" || pViewData[i].BILLING_PRICE__C === null || pViewData[i].GROUP_PRICE__C ===
								null) {
								pViewData[i].PRICE_LEVEL__C = "N/A";
							}
						} else {
							if (pViewData[i].PRICE_GRID_UNIQUE_KEY__C === null) {
								pViewData[i].PRICE_LEVEL__C = "N/A";
							} else if (pViewData[i].BILLING_PRICE__C === "0" && pViewData[i].TM_PRICE__C === "0" && pViewData[i].TM2_PRICE__C ===
								"0" &&
								pViewData[i].TM3_PRICE__C === "0" && pViewData[i].DM_PRICE__C === "0" && pViewData[i].RVP_PRICE__C === "0") {
								pViewData[i].PRICE_LEVEL__C = "N/A";
							} else if (parseFloat(pViewData[i].BILLING_PRICE__C) > parseFloat(pViewData[i].TM_PRICE__C)) {
								pViewData[i].PRICE_LEVEL__C = "> TM1";
							} else if ((parseFloat(pViewData[i].BILLING_PRICE__C) == parseFloat(pViewData[i].TM_PRICE__C)) &&
								(parseFloat(pViewData[i].BILLING_PRICE__C) == parseFloat(pViewData[i].TM2_PRICE__C)) && (parseFloat(pViewData[i].BILLING_PRICE__C) ==
									parseFloat(pViewData[i].TM3_PRICE__C))) {
								pViewData[i].PRICE_LEVEL__C = "TM1/TM2/TM3";
							} else if (parseFloat(pViewData[i].BILLING_PRICE__C) == parseFloat(pViewData[i].TM_PRICE__C)) {
								pViewData[i].PRICE_LEVEL__C = "TM1";
							} else if ((parseFloat(pViewData[i].BILLING_PRICE__C) < parseFloat(pViewData[i].TM_PRICE__C)) && (parseFloat(
									pViewData[i].BILLING_PRICE__C) >= parseFloat(pViewData[i].TM2_PRICE__C))) {
								pViewData[i].PRICE_LEVEL__C = "TM2";
							} else if ((parseFloat(pViewData[i].BILLING_PRICE__C) < parseFloat(pViewData[i].TM2_PRICE__C)) && (parseFloat(
									pViewData[i].BILLING_PRICE__C) >= parseFloat(pViewData[i].TM3_PRICE__C))) {
								pViewData[i].PRICE_LEVEL__C = "TM3";
							} else if ((parseFloat(pViewData[i].BILLING_PRICE__C) < parseFloat(pViewData[i].TM3_PRICE__C)) && (parseFloat(
									pViewData[i].BILLING_PRICE__C) >= parseFloat(pViewData[i].DM_PRICE__C))) {
								pViewData[i].PRICE_LEVEL__C = "DM";
							} else if ((parseFloat(pViewData[i].BILLING_PRICE__C) < parseFloat(pViewData[i].DM_PRICE__C)) && (parseFloat(
									pViewData[i].BILLING_PRICE__C) >= parseFloat(pViewData[i].RVP_PRICE__C))) {
								pViewData[i].PRICE_LEVEL__C = "RVP";
							} else if (parseFloat(pViewData[i].BILLING_PRICE__C) < parseFloat(pViewData[i].RVP_PRICE__C)) {
								pViewData[i].PRICE_LEVEL__C = "< RVP";
							}

						}
						//Added by Karan on 03.12.2020 for Primary Cushion story 2292 start
					} else {
						if (pViewData[i].PRICE_GRID_UNIQUE_KEY__C === null) {
							pViewData[i].PRICE_LEVEL__C = "N/A";
						} else if (pViewData[i].BILLING_PRICE__C === "0" && (pViewData[i].TM_1_TO_24_PRICE__C === "0" || pViewData[i].TM_1_TO_24_PRICE__C ==
								null) && (pViewData[i].DM_1_TO_24_PRICE__C === "0" || pViewData[i].DM_1_TO_24_PRICE__C == null) &&
							(pViewData[i].RVP_1_TO_24_PRICE__C === "0" || pViewData[i].RVP_1_TO_24_PRICE__C == null)) {
							pViewData[i].PRICE_LEVEL__C = "N/A";
						} else if (parseFloat(pViewData[i].BILLING_PRICE__C) > parseFloat(pViewData[i].TM_1_TO_24_PRICE__C)) {
							pViewData[i].PRICE_LEVEL__C = "> TM";
						} else if ((parseFloat(pViewData[i].BILLING_PRICE__C) == parseFloat(pViewData[i].TM_1_TO_24_PRICE__C))) {
							pViewData[i].PRICE_LEVEL__C = "TM";
						} else if ((parseFloat(pViewData[i].BILLING_PRICE__C) < parseFloat(pViewData[i].TM_1_TO_24_PRICE__C)) && (parseFloat(
								pViewData[i].BILLING_PRICE__C) >= parseFloat(pViewData[i].DM_1_TO_24_PRICE__C))) {
							pViewData[i].PRICE_LEVEL__C = "DM";
						} else if ((parseFloat(pViewData[i].BILLING_PRICE__C) < parseFloat(pViewData[i].DM_1_TO_24_PRICE__C)) && (parseFloat(
								pViewData[i].BILLING_PRICE__C) >= parseFloat(pViewData[i].RVP_1_TO_24_PRICE__C))) {
							pViewData[i].PRICE_LEVEL__C = "RVP";
						} else if (parseFloat(pViewData[i].BILLING_PRICE__C) < parseFloat(pViewData[i].RVP_1_TO_24_PRICE__C)) {
							pViewData[i].PRICE_LEVEL__C = "< RVP";
						}
					}
					//Added by Karan on 03.12.2020 for Primary Cushion story 2292 end
				}

				// Edit Access
				/*var editCheck = false;

				that.brCode = sap.ui.getCore().getModel("configModel").getProperty("/brCode");
				if (that.brCode && that.brCode.length > 0) { //Added additional condition at the start to check if variable is not undefined by Karan on 03.12.2020
					for (var n = 0; n < that.brCode.length; n++) {
						if (pViewData[i].ERP_PRODUCT_TYPE__C === that.brCode[n].proCode && pViewData[i].BRAND_CODE__C === that.brCode[n].brand) {
							editCheck = true;
							break;
						}
					}
					if (editCheck === true) {
						pViewData[i].EDITACCESS = "true";
					} else {
						pViewData[i].EDITACCESS = "false";
					}
				}*/ // Added after Menu button option check

				if (pViewData[i].APPROVAL_STATUS__C === "4") {
					pViewData[i].END_DATE__C = "/Date(" + new Date().getTime() + ")/";
				}
				//Added on 29-012021 by pratik
				if (pViewData[i].BUYING_GROUP_NUMBER__C === "") {
					pViewData[i].BUYING_GROUP_NUMBER__C = null;
				}
				if (pViewData[i].BUYING_GROUP__C === "") {
					pViewData[i].BUYING_GROUP__C = null;
				}
				//Added on 29-012021 by pratik

				//Edit Menu options Item Access Check - 2281
				if ((pViewData[i].APPROVAL_STATUS__C === "1" || pViewData[i].APPROVAL_STATUS__C === "4") && pViewData[i].MODIFIED_BY__C ===
					this.loggedInUser) {
					if (pViewData[i].APPROVAL_STATUS__C === "1") {
						pViewData[i].EDITMENUCHECK = true;
						pViewData[i].REMOVEMENUCHECK = true;

					} else if (pViewData[i].APPROVAL_STATUS__C === "4") {
						pViewData[i].EDITMENUCHECK = false;
						pViewData[i].REMOVEMENUCHECK = true;
					}
				} else if ((pViewData[i].APPROVAL_STATUS__C === "1" || pViewData[i].APPROVAL_STATUS__C === "4") && pViewData[i].MODIFIED_BY__C !==
					this.loggedInUser) {
					//Edit Menu options Item Access Check - 2281
					// Added by Binay
					if (pViewData[i].INFORMATION.includes("G") === false &&
						pViewData[i].BUYING_GROUP_NUMBER__C !== null &&
						(pViewData[i].BUYING_GROUP__C === null || pViewData[i].BUYING_GROUP__C === "0" || pViewData[i].BUYING_GROUP__C === "NA" ||
							pViewData[i].BUYING_GROUP__C === "N/A")) {
						pViewData[i].EDITCURRMENUCHECK = true;
						pViewData[i].EDITLIMITEDMENUCHECK = true;
						pViewData[i].REMOVECURRMENUCHECK = true;
					} else if (pViewData[i].INFORMATION.includes("G") === true &&
						pViewData[i].BUYING_GROUP_NUMBER__C !== null &&
						(pViewData[i].BUYING_GROUP__C === null || pViewData[i].BUYING_GROUP__C === "0" || pViewData[i].BUYING_GROUP__C === "NA" ||
							pViewData[i].BUYING_GROUP__C === "N/A")) {
						pViewData[i].EDITCURRMENUCHECK = false;
						pViewData[i].EDITLIMITEDMENUCHECK = false;
						pViewData[i].REMOVECURRMENUCHECK = false;
						pViewData[i].REMOVEMENUCHECK = false;
					} else if (pViewData[i].INFORMATION.includes("G") === true &&
						pViewData[i].BUYING_GROUP_NUMBER__C !== null &&
						(pViewData[i].BUYING_GROUP__C !== null || pViewData[i].BUYING_GROUP__C !== "0" || pViewData[i].BUYING_GROUP__C !== "NA" ||
							pViewData[i].BUYING_GROUP__C !== "N/A")) {
						pViewData[i].EDITCURRMENUCHECK = true;
						pViewData[i].EDITLIMITEDMENUCHECK = true;
						pViewData[i].REMOVECURRMENUCHECK = false;
						pViewData[i].REMOVEMENUCHECK = false;
					} else if (pViewData[i].INFORMATION.includes("G") === false &&
						pViewData[i].BUYING_GROUP_NUMBER__C !== null &&
						(pViewData[i].BUYING_GROUP__C !== null || pViewData[i].BUYING_GROUP__C !== "0" || pViewData[i].BUYING_GROUP__C !== "NA" ||
							pViewData[i].BUYING_GROUP__C !== "N/A")) {
						pViewData[i].EDITCURRMENUCHECK = true;
						pViewData[i].EDITLIMITEDMENUCHECK = true;
						pViewData[i].REMOVECURRMENUCHECK = true;
					} else if (pViewData[i].INFORMATION.includes("G") === true &&
						pViewData[i].BUYING_GROUP_NUMBER__C === null &&
						pViewData[i].PRICE_GRID_UNIQUE_KEY__C === null) {
						pViewData[i].EDITCURRMENUCHECK = true;
						pViewData[i].EDITLIMITEDMENUCHECK = true;
						pViewData[i].REMOVECURRMENUCHECK = false;
						pViewData[i].REMOVEMENUCHECK = false;
					} else if (pViewData[i].INFORMATION.includes("G") === false &&
						pViewData[i].BUYING_GROUP_NUMBER__C === null &&
						pViewData[i].PRICE_GRID_UNIQUE_KEY__C === null) {
						pViewData[i].EDITCURRMENUCHECK = true;
						pViewData[i].EDITLIMITEDMENUCHECK = true;
						pViewData[i].REMOVECURRMENUCHECK = true;
					} else if (pViewData[i].INFORMATION.includes("G") === true &&
						pViewData[i].BUYING_GROUP_NUMBER__C === null &&
						pViewData[i].PRICE_GRID_UNIQUE_KEY__C !== null) {
						pViewData[i].EDITCURRMENUCHECK = true;
						pViewData[i].EDITLIMITEDMENUCHECK = true;
						pViewData[i].REMOVECURRMENUCHECK = false;
						pViewData[i].REMOVEMENUCHECK = false;
					} else if (pViewData[i].INFORMATION.includes("G") === false &&
						pViewData[i].BUYING_GROUP_NUMBER__C === null &&
						pViewData[i].PRICE_GRID_UNIQUE_KEY__C !== null) {
						pViewData[i].EDITCURRMENUCHECK = true;
						pViewData[i].EDITLIMITEDMENUCHECK = true;
						pViewData[i].REMOVECURRMENUCHECK = true;
					}
					// Added by Binay
				} else {
					//Edit Menu options Item Access Check - 2281
					// Added by Binay
					if (pViewData[i].INFORMATION.includes("G") === false &&
						pViewData[i].BUYING_GROUP_NUMBER__C !== null &&
						(pViewData[i].BUYING_GROUP__C === null || pViewData[i].BUYING_GROUP__C === "0" || pViewData[i].BUYING_GROUP__C === "NA" ||
							pViewData[i].BUYING_GROUP__C === "N/A")) {
						pViewData[i].EDITCURRMENUCHECK = true;
						pViewData[i].EDITLIMITEDMENUCHECK = true;
						pViewData[i].REMOVECURRMENUCHECK = true;
					} else if (pViewData[i].INFORMATION.includes("G") === true &&
						pViewData[i].BUYING_GROUP_NUMBER__C !== null &&
						(pViewData[i].BUYING_GROUP__C === null || pViewData[i].BUYING_GROUP__C === "0" || pViewData[i].BUYING_GROUP__C === "NA" ||
							pViewData[i].BUYING_GROUP__C === "N/A")) {
						pViewData[i].EDITCURRMENUCHECK = false;
						pViewData[i].EDITLIMITEDMENUCHECK = false;
						pViewData[i].REMOVECURRMENUCHECK = false;
						pViewData[i].REMOVEMENUCHECK = false;
					} else if (pViewData[i].INFORMATION.includes("G") === true &&
						pViewData[i].BUYING_GROUP_NUMBER__C !== null &&
						(pViewData[i].BUYING_GROUP__C !== null || pViewData[i].BUYING_GROUP__C !== "0" || pViewData[i].BUYING_GROUP__C !== "NA" ||
							pViewData[i].BUYING_GROUP__C !== "N/A")) {
						pViewData[i].EDITCURRMENUCHECK = true;
						pViewData[i].EDITLIMITEDMENUCHECK = true;
						pViewData[i].REMOVECURRMENUCHECK = false;
						pViewData[i].REMOVEMENUCHECK = false;
					} else if (pViewData[i].INFORMATION.includes("G") === false &&
						pViewData[i].BUYING_GROUP_NUMBER__C !== null &&
						(pViewData[i].BUYING_GROUP__C !== null || pViewData[i].BUYING_GROUP__C !== "0" || pViewData[i].BUYING_GROUP__C !== "NA" ||
							pViewData[i].BUYING_GROUP__C !== "N/A")) {
						pViewData[i].EDITCURRMENUCHECK = true;
						pViewData[i].EDITLIMITEDMENUCHECK = true;
						pViewData[i].REMOVECURRMENUCHECK = true;
					} else if (pViewData[i].INFORMATION.includes("G") === true &&
						pViewData[i].BUYING_GROUP_NUMBER__C === null &&
						pViewData[i].PRICE_GRID_UNIQUE_KEY__C === null) {
						pViewData[i].EDITCURRMENUCHECK = true;
						pViewData[i].EDITLIMITEDMENUCHECK = true;
						pViewData[i].REMOVECURRMENUCHECK = false;
						pViewData[i].REMOVEMENUCHECK = false;
					} else if (pViewData[i].INFORMATION.includes("G") === false &&
						pViewData[i].BUYING_GROUP_NUMBER__C === null &&
						pViewData[i].PRICE_GRID_UNIQUE_KEY__C === null) {
						pViewData[i].EDITCURRMENUCHECK = true;
						pViewData[i].EDITLIMITEDMENUCHECK = true;
						pViewData[i].REMOVECURRMENUCHECK = true;
					} else if (pViewData[i].INFORMATION.includes("G") === true &&
						pViewData[i].BUYING_GROUP_NUMBER__C === null &&
						pViewData[i].PRICE_GRID_UNIQUE_KEY__C !== null) {
						pViewData[i].EDITCURRMENUCHECK = true;
						pViewData[i].EDITLIMITEDMENUCHECK = true;
						pViewData[i].REMOVECURRMENUCHECK = false;
						pViewData[i].REMOVEMENUCHECK = false;
					} else if (pViewData[i].INFORMATION.includes("G") === false &&
						pViewData[i].BUYING_GROUP_NUMBER__C === null &&
						pViewData[i].PRICE_GRID_UNIQUE_KEY__C !== null) {
						pViewData[i].EDITCURRMENUCHECK = true;
						pViewData[i].EDITLIMITEDMENUCHECK = true;
						pViewData[i].REMOVECURRMENUCHECK = true;
					}
					// Added by Binay
				}

				// added for issue - 4275
				if (pViewData[i].APPROVAL_STATUS__C === "") {
					if (pViewData[i].START_DATE__C.split("(").length > 1) {
						var std = new Date(parseFloat(pViewData[i].START_DATE__C.split("(")[1].split(")")[0]));
					} else {
						var std = new Date(parseFloat(new Date(pViewData[i].START_DATE__C).getTime()));
					}
					// var std = new Date(pViewData[i].START_DATE__C);
					var today = new Date();
					if (std > today) {
						if (pViewData[i].PRICE_INCREASE_FLAG__C === "X") {
							pViewData[i].REMOVECURRMENUCHECK = false;
						} else {
							pViewData[i].REMOVECURRMENUCHECK = true;
						}
					} else
					if (pViewData[i].INFORMATION.includes("G") === true) //Added by <JAYANT PRAKASH> for <4329> on <01.20.2021>
					{
						pViewData[i].REMOVECURRMENUCHECK = false;
					}
				}

				// Edit Menu 
				var editCheck = false;

				this.brCode = sap.ui.getCore().getModel("configModel").getProperty("/brCode");
				if (this.brCode && this.brCode.length > 0) { //Added additional condition at the start to check if variable is not undefined by Karan on 03.12.2020
					for (var n = 0; n < this.brCode.length; n++) {
						if (pViewData[i].ERP_PRODUCT_TYPE__C === this.brCode[n].proCode && pViewData[i].BRAND_CODE__C === this.brCode[n].brand) {
							editCheck = true;
							break;
						}
						if (pViewData[i].APPROVAL_STATUS__C == "2" || pViewData[i].APPROVAL_STATUS__C == "3" || pViewData[i].APPROVAL_STATUS__C ==
							"A" || pViewData[i].APPROVAL_STATUS__C == "F") {
							editCheck = false;
							break;
						}
					}
					if (editCheck === true && (pViewData[i].REMOVECURRMENUCHECK === true || pViewData[i].EDITCURRMENUCHECK === true ||
							pViewData[i].EDITLIMITEDMENUCHECK === true || pViewData[i].REMOVEMENUCHECK === true)) {
						pViewData[i].EDITACCESS = "true";
					} else {
						pViewData[i].EDITACCESS = "false";
					}
				}

				/*if (pViewData[i].CPL_PRICE_ID__C.length >= 18 && pViewData[i].APPROVAL_STATUS__C === "1") {
					if (pViewData[i].START_DATE__C.split("(").length > 1) {
						var std = new Date(parseFloat(pViewData[i].START_DATE__C.split("(")[1].split(")")[0]));
					} else {
						var std = new Date(parseFloat(new Date(pViewData[i].START_DATE__C).getTime()));
					}
					// var std = new Date(pViewData[i].START_DATE__C);
					var today = new Date();
					if (std > today) {
						if (pViewData[i].PRICE_INCREASE_FLAG__C === "X") {
							pViewData[i].REMOVEMENUCHECK = false;
						} else {
							pViewData[i].REMOVEMENUCHECK = true;
						}
					} else {
						pViewData[i].REMOVEMENUCHECK = false;
					}
				}*/
			}

			/*function SortByName(data) {
				// sort by name
				data.sort(function (a, b) {
					var nameA = a.NAME.toUpperCase(); // ignore upper and lowercase
					var nameB = b.NAME.toUpperCase(); // ignore upper and lowercase
					if (nameA < nameB) {
						return -1;
					}
					if (nameA > nameB) {
						return 1;
					}
					// names must be equal
					return 0;
				});
			}*/

			var currentUser = this.loggedInUser;
			var blueData = pViewData.filter(function (a) {
				return (a.APPROVAL_STATUS__C == "1" || a.APPROVAL_STATUS__C == "4") && a.MODIFIED_BY__C == currentUser;
			});

			// SortByName(blueData);
			this.SortByName(blueData);
			this.draftRecords = blueData;

			var redData = pViewData.filter(function (a) {
				return (a.APPROVAL_STATUS__C == "2" || a.APPROVAL_STATUS__C == "3") && a.MODIFIED_BY__C == currentUser;
			});
			/*for(var i=0; i<redData.length; i++) {
				redData[i].EDITACCESS = "false";
			}*/

			// SortByName(redData);
			this.SortByName(redData);

			var greenData = pViewData.filter(function (a) {
				return a.APPROVAL_STATUS__C == "A" && a.MODIFIED_BY__C == currentUser;
			});

			// SortByName(greenData);
			this.SortByName(greenData);

			var purpleData = pViewData.filter(function (a) {
				return a.APPROVAL_STATUS__C == "F" && a.MODIFIED_BY__C == currentUser;
			});

			// SortByName(purpleData);
			this.SortByName(purpleData);

			var otherUserData = pViewData.filter(function (a) {
				return !(a.APPROVAL_STATUS__C === "1" && a.CPL_PRICE_ID__C.length === 18 && a.MODIFIED_BY__C !== currentUser);
			});

			var blackData = otherUserData.filter(function (el) {
				return !blueData.includes(el) && !redData.includes(el) && !greenData.includes(el) && !purpleData.includes(el);
			});
			/*var blackData = pViewData.filter(function (el) {
				return !blueData.includes(el) && !redData.includes(el) && !greenData.includes(el) && !purpleData.includes(el) && ((el.APPROVAL_STATUS__C == "1" || el.APPROVAL_STATUS__C == "4" || el.APPROVAL_STATUS__C == "2" || el.APPROVAL_STATUS__C == "3" || el.APPROVAL_STATUS__C == "A" || el.APPROVAL_STATUS__C == "F") && el.MODIFIED_BY__C !== currentUser);
			});*/

			// SortByName(blackData);
			this.SortByName(blackData);

			var allData = blueData.concat(redData).concat(greenData).concat(purpleData).concat(blackData);
			

			var href = document.location.href;
			if (href.includes("MultiEdit")) {
				meViewModel.setData(allData);
				sap.ui.getCore().setModel(meViewModel, "meViewModel");
				this.getView().setModel(meViewModel, "meViewModel");
				this.bindMERecords();
			} else {
				pViewModel.setData(allData);
				sap.ui.getCore().setModel(pViewModel, "pViewModel");
				this.getView().setModel(pViewModel, "pViewModel");
				this.bindRecords();
				this.getView().byId("sortButton").setEnabled(true);
				this.getView().byId("sortButton2").setEnabled(true);
				if (allData.length > 0) {
					this.getView().byId("submitButton").setEnabled(true);
					this.getView().byId("multiPricing").setEnabled(true);
				} else {
					this.getView().byId("submitButton").setEnabled(false);
					this.getView().byId("multiPricing").setEnabled(false);
				}
			}

			sap.ui.getCore().busyIndicator.close();
			this.mainData = [];

			// that.concatDataFlag = false;
			sap.ui.getCore().getModel("configModel").setProperty("/concatDataFlag", false);
		},

		loadOnScroll: function (e) {
			if ($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight) {
				console.log('This is the bottom of the container');
				if (this.globalSearch === false || this.globalSearch === undefined) {
					if (e.data.g.completeResult === false) {
						if (e.data.g.endResult === false) {
							// e.data.g.fetchTotal = e.data.g.fetchTotal + 100;
							e.data.g.fetchTotal = 100;
							e.data.g.fetchSkip = e.data.g.fetchSkip + 100;
							e.data.g.getBlackProduct = true;
							e.data.g.fetchProducts();
						} else {
							e.data.g.fetchProducts();
						}
					}
				}
			}
		},

	});

});