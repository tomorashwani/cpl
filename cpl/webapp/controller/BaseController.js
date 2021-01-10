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

			if (sPreviousHash !== undefined) {
				// eslint-disable-next-line sap-no-history-manipulation
				history.go(-1);
			} else {
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
					"name": "SolidWood"
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
			this.fetchTotal = 100;
			this.fetchSkip = 0;
			// this.fetchProducts();
			this.getPageDetail();
		},

		onBrandChange: function (oEvent) {
			this.selectedChannel = oEvent.getParameters().value;
			this.fetchTotal = 100;
			this.fetchSkip = 0;
			// this.fetchProducts();
			this.getPageDetail();
		},

		getPageDetail: function () {
			var href = document.location.href;
			if (href.includes("AddProduct")) {
				this.pageName = "AddProduct";
				this.fetchAddProducts();
			} else {
				this.pageName = "Master";
				this._filterDisable();
				if (this.sortDialog) {
					this.sortDialog.destroy();
					delete this.sortDialog;
				}
				this.fetchProducts();
			}
		},

		onFilter: function () {
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
		},

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
			$.ajax({
				url: "pricing/GetTimeZone.xsjs",
				contentType: "application/json",
				type: 'GET',
				dataType: "json",
				async: false,
				success: function (response) {
					timeOffSet = response;
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
				let objectA = objA['ADD_PRODUCT_SORT_ORDER__C'];
				let objectB = objB['ADD_PRODUCT_SORT_ORDER__C'];
				if (objectA == undefined || objectB == undefined) return 0;
				else return objectA - objectB;
			} else {
				if (objA['PRIMARY_DISPLAY_ORDER__C'] === undefined || objB['PRIMARY_DISPLAY_ORDER__C'] === undefined) return 1;
				let objectA = objA['PRIMARY_DISPLAY_ORDER__C'];
				let objectB = objB['PRIMARY_DISPLAY_ORDER__C'];
				if (objectA == undefined || objectB == undefined) return 0;
				else return objectA - objectB;
			}
		}

	});

});