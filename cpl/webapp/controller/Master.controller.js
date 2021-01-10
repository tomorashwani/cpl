jQuery.sap.require("sap.ui.core.format.DateFormat");
sap.ui.define([
	"./BaseController",
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
], function (BaseController, JSONModel, Filter, Sorter, FilterOperator, GroupHeaderListItem, Device, Fragment, MessageBox, formatter,
	MessageToast) {
	"use strict";

	return BaseController.extend("cf.cpl.controller.Master", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the master list controller is instantiated. It sets up the event handling for the master/detail communication and other lifecycle tasks.
		 * @public
		 */
		onInit: function () {

			var oDeviceModel = new JSONModel(Device);
			this.setModel(oDeviceModel, "device");

			var oList = this.byId("list");
			//var oViewModel = this._createViewModel();
			// Put down master list's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the master list is
			// taken care of by the master list itself.
			// iOriginalBusyDelay = oList.getBusyIndicatorDelay();

			this._oList = oList;
			// keeps the filter and search state
			this._oListFilterState = {
				aFilter: [],
				aSearch: []
			};

			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oList.attachEventOnce("updateFinished", function () {
				// Restore original busy indicator delay for the list
				// oViewModel.setProperty("/delay", iOriginalBusyDelay);
			});

			this.getView().addEventDelegate({
				onBeforeFirstShow: function () {
					this.getOwnerComponent().oListSelector.setBoundMasterList(oList);
				}.bind(this)
			});

			this.getRouter().getRoute("master").attachPatternMatched(this._onMasterMatched, this);
			this.getRouter().attachBypassed(this.onBypassed, this);

			/*this.proCat = {
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
			};*/

			var lModel = new JSONModel(this.productCategory());
			this.getView().setModel(lModel, "local");
			this.getView().byId("prodCat").setModel(lModel, "local");
			this.getView().byId("prodCat2").setModel(lModel, "local");

			var localData = this.getOwnerComponent().getModel("local").getData();
			this.filterData = localData.FilterMapping;

			this.getView().byId("masterPage2").setVisible(false);
			this.getView().byId("masterPage").setVisible(true);

			// this.user = 'Ashley Nalley';
			var that = this;
			this.lmtdPrice = false;
			var appName = "Customer_Price_List";
			this.loggedInUser = "";

			// Catalogue Service:
			sap.ui.getCore().busyIndicator.open();
			$.ajax({
				url: "pricing/PriceGrid.xsodata/Catalogue?$filter=GRID_TYPE eq '" + appName + "'",
				contentType: "application/json",
				type: 'GET',
				dataType: "json",
				async: false,
				success: function (response) {
					that.gridmeta = response.d.results;
					that.gridmeta.sort(that.sortGridMeta);
					var oModel = new JSONModel(that.gridmeta);
					sap.ui.getCore().setModel(oModel, "configModel");
					sap.ui.getCore().getModel("configModel").setData(that.gridmeta);
					sap.ui.getCore().busyIndicator.close();
				},
				error: function (error) {
					sap.ui.getCore().busyIndicator.close();
				}
			});

			// Get Account Number
			var whURL = "pricing/PriceGrid.xsodata/Account";
			var searchParam = document.location.href.split("?");
			if (searchParam.length > 1) {
				var accNo = "";
				if (searchParam.length > 1) {
					accNo = searchParam[1].split("=")[1];
				}
				accNo = accNo.includes("#") ? accNo.replace("#", '') : accNo;
				this.accNo = accNo;
				whURL = "pricing/PriceGrid.xsodata/Account?$filter=ACCOUNT__C eq '" + accNo + "'";
			}

			sap.ui.getCore().busyIndicator.open();
			$.ajax({
				// url: "pricing/PriceGrid.xsodata/Warehouse",
				url: whURL,
				contentType: "application/json",
				type: 'GET',
				dataType: "json",
				async: false,
				success: function (response) {
					var whResults = response.d.results;

					that.warehouses = [];
					for (var j = 0; j < whResults.length; j++) {
						var tempWH = {
							"WAREHOUSE_CODE__C": whResults[j].WAREHOUSE_CODE__C,
							"WAREHOUSE_CODE__DESC": whResults[j].WAREHOUSE_CODE__DESC
						};
						var whAdded = false;
						for (var s = 0; s < that.warehouses.length; s++) {
							if (that.warehouses[s].WAREHOUSE_CODE__C === tempWH.WAREHOUSE_CODE__C) {
								whAdded = true;
							}
						}
						if (whAdded === false) {
							that.warehouses.push(tempWH);
						}
					}

					that.warehouses.unshift({
						"WAREHOUSE_CODE__C": "",
						"WAREHOUSE_CODE__DESC": ""
					});
					
					var oModel = new JSONModel(that.warehouses);
					that.byId("wh").setModel(oModel, "warehouses");
					that.byId("wh2").setModel(oModel, "warehouses");
					sap.ui.getCore().getModel("configModel").setProperty("/wh", that.warehouses);
					sap.ui.getCore().busyIndicator.close();
				},
				error: function (error) {
					that.warehouses = false;
					sap.ui.getCore().busyIndicator.close();
				}
			});

			sap.ui.getCore().busyIndicator.open();
			$.ajax({
				url: "pricing/PriceGrid.xsodata/Brand",
				contentType: "application/json",
				type: 'GET',
				dataType: "json",
				async: false,
				success: function (response) {
					console.log(response.d.results);

					var brand = response.d.results;

					var salesChnl = [];
					for (var j = 0; j < brand.length; j++) {
						var tempBrand = {
							"key": j,
							"channel": brand[j].SALES_CHANNEL__C
						};
						var channelAdded = false;
						for (var s = 0; s < salesChnl.length; s++) {
							if (salesChnl[s].channel === tempBrand.channel) {
								channelAdded = true;
							}
						}
						if (channelAdded === false) {
							salesChnl.push(tempBrand);
						}
					}

					that.filteredBrand = [];

					salesChnl.unshift({
						"key": "",
						"channel": ""
					});

					that.allSalesChnl = salesChnl;

					var oModel = new JSONModel(salesChnl);
					that.getView().setModel(oModel, "brandModel");
					that.getView().getModel("brandModel").setProperty("/allBrand", brand);
					that.getView().getModel("brandModel").setProperty("/filteredBrand", that.filteredBrand);
					that.getView().getModel("brandModel").setProperty("/allChannel", salesChnl);
					sap.ui.getCore().getModel("configModel").setProperty("/allChannel", salesChnl);
					sap.ui.getCore().getModel("configModel").setProperty("/allBrand", brand);

					that.getView().byId("masterPage2").setVisible(false);
					that.getView().byId("masterPage").setVisible(true);
					sap.ui.getCore().busyIndicator.close();
				},
				error: function (error) {
					sap.ui.getCore().busyIndicator.close();
				}
			});

			sap.ui.getCore().busyIndicator.open();
			$.ajax({
				url: "pricing/PriceGrid.xsodata/PromoCode?$format=json",
				contentType: "application/json",
				type: 'GET',
				dataType: "json",
				async: false,
				success: function (response) {
					var promoData = response.d.results
					var promoModel = new JSONModel();
					promoModel.setData(promoData);
					that.getView().setModel(promoModel, "promoModel");
					sap.ui.getCore().busyIndicator.close();
				},
				error: function (error) {
					sap.ui.getCore().busyIndicator.close();
				}
			});

		},

		onAfterRendering: function (oEvent) {

			var that = this;
			sap.ui.getCore().busyIndicator.open();
			$.ajax({
				url: "../user"
			}).done(function (data, status, jqxhr) {
				console.log(data);
				that.loggedInUser = data;
				var g = that;
				$.ajax({
					url: "pricing/PriceGrid.xsodata/UserRole?$filter=EMAILID eq '" + data + "'",
					contentType: "application/json",
					type: 'GET',
					dataType: "json",
					async: false,
					success: function (response) {
						if (response.d.results.length > 0) {
							that.userRole = response.d.results[0].ROLE;
							g.empNo = response.d.results[0].EMPLOYEENUMBER;
							g._getTerritoryUser(g.empNo);
						}
						sap.ui.getCore().getModel("configModel").setProperty("/userRole", that.userRole);
						sap.ui.getCore().busyIndicator.close();
					},
					error: function (error) {
						sap.ui.getCore().busyIndicator.close();
					}
				});
			});

			// this.loggedInUser = "Saradha_Varadharajan@mohawkind.com";


			$("#container-cpl---master--list").on('scroll', {
				g: this
			}, this.loadOnScroll);
			var lsModel = new JSONModel();
			this.getView().setModel(lsModel, "listModel");
			var pViewModel = new JSONModel();
			this.getView().setModel(pViewModel, "pViewModel");
			this._filterDisable();

			var priceModel = new JSONModel();
			this.fetchTotal = 100; //`Top` variable in teh ajax call
			this.fetchSkip = 0;
			var g = this;
			this.fetchProducts();
			this.endResult = false;
			this.globalSearchField = "";
			this.globalSearchValue = "";
			this.brCode = [];
			this.productCode = [];

		},

		_getTerritoryUser: function (empNo) {
			var that = this;
			sap.ui.getCore().busyIndicator.open();
			$.ajax({
				url: "pricing/PriceGrid.xsodata/TerritoryUser",
				contentType: "application/json",
				type: 'GET',
				dataType: "json",
				async: false,
				success: function (response) {
					var territoryData = response.d.results;
					sap.ui.getCore().getModel("configModel").setProperty("/territoryData", territoryData);
					that._roleGrp(territoryData, empNo);
					sap.ui.getCore().busyIndicator.close();
				},
				error: function (error) {
					sap.ui.getCore().busyIndicator.close();
				}
			});
		},

		_roleGrp: function (territoryData, empNo) {
			var TMData = territoryData.filter(function (a) {
				return a.CAMS_EMPLOYEE_NUM__C === empNo && a.ROLE__C === "Territory Manager";
			});
			var RVPData = territoryData.filter(function (a) {
				return a.CAMS_EMPLOYEE_NUM__C === empNo && a.ROLE__C === "Regional Vice President";
			});
			var DMData = territoryData.filter(function (a) {
				return a.CAMS_EMPLOYEE_NUM__C === empNo && a.ROLE__C === "District Manager";
			});

			var roleNameTM = [];
			var roleNameRVP = [];
			var roleNameDM = [];

			if (TMData.length > 0) {
				for (var i = 0; i < TMData.length; i++) {
					var tempRoleName = {
						"key": i,
						"NAME": TMData[i].NAME
					};
					var roleNameAdded = false;
					for (var p = 0; p < roleNameTM.length; p++) {
						if (roleNameTM[p].NAME === tempRoleName.NAME) {
							roleNameAdded = true;
						}
					}
					if (roleNameAdded === false) {
						roleNameTM.push(tempRoleName);
					}
				}
			}

			var regionCode = [];
			if (RVPData.length > 0) {
				for (var j = 0; j < RVPData.length; j++) {
					var tempRegionCode = {
						"key": j,
						"REGION_CODE__C": RVPData[j].REGION_CODE__C
					};
					var regionCodeAdded = false;
					for (var q = 0; q < regionCode.length; q++) {
						if (regionCode[q].REGION_CODE__C === tempRegionCode.REGION_CODE__C) {
							regionCodeAdded = true;
						}
					}
					if (regionCodeAdded === false) {
						regionCode.push(tempRegionCode);
					}
				}
			}

			if (regionCode.length > 0) {
				roleNameRVP = territoryData.filter(function (b) {
					for (var k = 0; k < regionCode.length; k++) {
						if (regionCode[k].REGION_CODE__C === b.REGION_CODE__C) {
							return b;
						}
					}
				});
			}

			var territoryCode = [];
			if (DMData.length > 0) {
				for (var l = 0; l < DMData.length; l++) {
					var tempTerritoryCode = {
						"key": l,
						"TERRITORY_CODE__C": DMData[l].TERRITORY_CODE__C
					};
					var territoryCodeAdded = false;
					for (var r = 0; r < territoryCode.length; r++) {
						if (territoryCode[r].TERRITORY_CODE__C === tempTerritoryCode.TERRITORY_CODE__C) {
							territoryCodeAdded = true;
						}
					}
					if (territoryCodeAdded === false) {
						territoryCode.push(tempTerritoryCode);
					}
				}
			}

			if (territoryCode.length > 0) {
				roleNameDM = territoryData.filter(function (b) {
					for (var k = 0; k < territoryCode.length; k++) {
						if (territoryCode[k].TERRITORY_CODE__C === b.TERRITORY_CODE__C) {
							return b;
						}
					}
				});
			}

			this._accountProductCall(roleNameTM, roleNameRVP, roleNameDM);

		},

		_accountProductCall: function (roleNameTM, roleNameRVP, roleNameDM) {

			var allName = [];

			if (roleNameTM.length > 0) {
				for (var i = 0; i < roleNameTM.length; i++) {
					var tempName = {
						"NAME": roleNameTM[i].NAME
					};
					var nameAdded = false;
					for (var s = 0; s < allName.length; s++) {
						if (allName[s].NAME === tempName.NAME) {
							nameAdded = true;
						}
					}
					if (nameAdded === false) {
						allName.push(tempName);
					}
				}
			}
			if (roleNameRVP.length > 0) {
				for (var j = 0; j < roleNameRVP.length; j++) {
					var tempName = {
						"NAME": roleNameRVP[j].NAME
					};
					var nameAdded = false;
					for (var s = 0; s < allName.length; s++) {
						if (allName[s].NAME === tempName.NAME) {
							nameAdded = true;
						}
					}
					if (nameAdded === false) {
						allName.push(tempName);
					}
				}
			}
			if (roleNameDM.length > 0) {
				for (var k = 0; k < roleNameDM.length; k++) {
					var tempName = {
						"NAME": roleNameDM[k].NAME
					};
					var nameAdded = false;
					for (var s = 0; s < allName.length; s++) {
						if (allName[s].NAME === tempName.NAME) {
							nameAdded = true;
						}
					}
					if (nameAdded === false) {
						allName.push(tempName);
					}
				}
			}

			var nameFilter = ""
			for (var z = 0; z < allName.length; z++) {
				if (z === 0) {
					nameFilter = nameFilter + "SALES_GROUP_TM__C eq '" + allName[z].NAME + "'";
				} else {
					nameFilter = nameFilter + " or SALES_GROUP_TM__C eq '" + allName[z].NAME + "'";
				}
			}

			if (this.accNo !== "" && this.accNo !== undefined) {
				var accPrdFilter = "ACCOUNT__C eq '" + this.accNo + "' and (" + nameFilter + ")";
			} else {
				var accPrdFilter = nameFilter;
			}
			var that = this;
			sap.ui.getCore().busyIndicator.open();
			$.ajax({
				url: "pricing/PriceGrid.xsodata/AccountProductUser?$filter=" + accPrdFilter,
				contentType: "application/json",
				type: 'GET',
				dataType: "json",
				async: false,
				success: function (response) {
					var data = response.d.results;
					var brCode = [];

					for (var i = 0; i < data.length; i++) {
						var tempProCode = {
							"brand": data[i].BRAND_CODE__C,
							"proCode": data[i].PRODUCT_TYPE__C
						};
						brCode.push(tempProCode);
					}
					that.brCode = brCode;
					sap.ui.getCore().getModel("configModel").setProperty("/brCode", brCode);
					sap.ui.getCore().busyIndicator.close();
				},
				error: function (error) {
					sap.ui.getCore().busyIndicator.close();
				}
			});
		},

		_filterDisable: function () {
			var pViewModel = this.getView().getModel("pViewModel");
			if (pViewModel) {
				pViewModel.setProperty("/brandsVisible", false);
				pViewModel.setProperty("/fibersVisible", false);
				pViewModel.setProperty("/fiberBrandsVisible", false);
				pViewModel.setProperty("/constructionsVisible", false);
				pViewModel.setProperty("/weightsVisible", false);
				pViewModel.setProperty("/collectionsVisible", false);
				pViewModel.setProperty("/displayVehiclesVisible", false);
				pViewModel.setProperty("/categoriesVisible", false);
				pViewModel.setProperty("/densityVisible", false);
				pViewModel.setProperty("/gaugeVisible", false);
				pViewModel.setProperty("/sizeVisible", false);
				pViewModel.setProperty("/antimicrobialVisible", false);
				pViewModel.setProperty("/moistureBarriersVisible", false);
				pViewModel.setProperty("/localStockVisible", false);
				pViewModel.setProperty("/segmentsVisible", false);
				pViewModel.setProperty("/widthsVisible", false);
				pViewModel.setProperty("/speciesVisible", false);
				pViewModel.setProperty("/texturesVisible", false);
				pViewModel.setProperty("/featuresVisible", false);
				pViewModel.setProperty("/coresVisible", false);
				pViewModel.setProperty("/wearLayerVisible", false);
				pViewModel.setProperty("/installationVisible", false);
				pViewModel.setProperty("/backingVisible", false);
				pViewModel.setProperty("/descriptionsVisible", false);
				pViewModel.setProperty("/applicationVisible", false);
				pViewModel.setProperty("/technologyVisible", false);
				pViewModel.setProperty("/thicknessVisible", false);
				this.getView().setModel(pViewModel, "pViewModel");
			}
		},
		/*onFilter: function () {
			var ffVBox = sap.ui.getCore().byId("ffVBox");
			var filterData = this.filterData;
			var that = this;
			var selectedFilters = filterData.filter(function (c) {
				return c.category == that.selectedCat;
			});
			var pViewModel = this.getView().getModel("pViewModel");

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

		handlePressClose: function () {
			this.byId("filter").close();
		},

		/*onCategoryChange: function (oEvent) {
			// this.selectedCat = oEvent.getParameters().value;
			this.selectedCat = oEvent.getSource().getSelectedKey();
			this.fetchTotal = 100;
			this.fetchSkip = 0;
			this._filterDisable();
			if (this.sortDialog) {
				this.sortDialog.destroy();
				delete this.sortDialog;
			}
			this.fetchProducts();
		},

		onWhChange: function (oEvent) {
			this.selectedWH = oEvent.getSource().getSelectedKey();
			this.fetchTotal = 100;
			this.fetchSkip = 0;
			this.fetchProducts();
		},

		onBrandChange: function (oEvent) {
			this.selectedChannel = oEvent.getParameters().value;
			this.fetchTotal = 100;
			this.fetchSkip = 0;
			this.fetchProducts();
		},*/

		fetchProducts: function () {
			var brand = this.byId("brand").getModel("brandModel").getProperty("/allBrand");
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
				var pViewModel = this.getView().getModel("pViewModel");

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
						var url = "pricing/PriceGrid.xsodata/" + viewName + "?$filter=WAREHOUSE_CODE__C eq '" +
							this.selectedWH + "' " + urlBrand + ")&$skip=" + this.fetchSkip + "&$top=" + this.fetchTotal + "&$format=json";
					}
				} else {
					if (this.accNo.split(".")[2] !== "0000") {
						this.preAcc = this.accNo.replace(this.accNo.split(".")[2], "0000");
						if (this.globalSearchValue !== "" && this.globalSearchValue !== undefined) {
							var url = "pricing/" + viewName + ".xsjs?Whcode=" + this.selectedWH + "&accountNo1=" + this.accNo + "&accountNo2=" + this.preAcc +
								"&Brandcode=" + this.selectedChannel +
								"&globalsearchKey=" + this.globalSearchValue + "&limit=" + this.fetchTotal + "&from=" + this.fetchSkip + "&$format=json";
						} else {
							var url = "pricing/PriceGrid.xsodata/" + viewName + "?$filter=ACCOUNT__C eq '" + this.accNo + "' or ACCOUNT__C eq '" +
								this.preAcc + "' and WAREHOUSE_CODE__C eq '" +
								this.selectedWH + "' " + urlBrand + ")&$skip=" + this.fetchSkip + "&$top=" + this.fetchTotal + "&$format=json";
						}
					} else {
						if (this.globalSearchValue !== "" && this.globalSearchValue !== undefined) {
							var url = "pricing/" + viewName + ".xsjs?Whcode=" + this.selectedWH + "&accountNo1=" + this.accNo + "&accountNo2=NA&Brandcode=" +
								this.selectedChannel +
								"&globalsearchKey=" + this.globalSearchValue + "&limit=" + this.fetchTotal + "&from=" + this.fetchSkip + "&$format=json";
						} else {
							var url = "pricing/PriceGrid.xsodata/" + viewName + "?$filter=ACCOUNT__C eq '" + this.accNo +
								"' and WAREHOUSE_CODE__C eq '" +
								this.selectedWH + "' " + urlBrand + ")&$skip=" + this.fetchSkip + "&$top=" + this.fetchTotal + "&$format=json";
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
							if (data.length < that.fetchTotal) {
								that.endResult = true;
							} else {
								that.endResult = false;
							}

							data = data.filter(function (c) {
								var endDate = 0;
								if(c.END_DATE__C !== null){
									if (c.END_DATE__C.split("(").length > 1) {
									endDate = parseFloat(c.END_DATE__C.split("(")[1].split(")")[0]);
								} else {
									endDate = parseFloat(new Date(c.END_DATE__C).getTime());
								}
								var currDate = new Date().getTime();
								return endDate > currDate;
								}
								
							});

							pViewModel.setData(data);
							var pViewData = data;
							// var offset = +5.5;
							var timeZone = that.getTimeZone();
							var offset = timeZone/60;
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
								if (pViewData[i].ACCOUNT__C === that.preAcc) {
									pViewData[i].INFORMATION += " I";
								}
								if (pViewData[i].BUYING_GROUP_PRICE__C === "X") {
									pViewData[i].INFORMATION += " G";
								}
								if (pViewData[i].MIN_ORDER_QTY__C === "X") {
									pViewData[i].INFORMATION += " Q";
								}
								if (that.selectedCat === "Commercial Broadloom" || that.selectedCat === "Residential Broadloom") {
									if (pViewData[i].BILLING_PRICE_ROLL__C !== pViewData[i].NET_PRICE_ROLL__C && pViewData[i].BILLING_PRICE_CUT__C !==
										pViewData[i].NET_PRICE_CUT__C) {
										pViewData[i].INFORMATION += " $";
									}
								} else {
									if (pViewData[i].BILLING_PRICE__C !== pViewData[i].NET_PRICE__C) {
										pViewData[i].INFORMATION += " $";
									}
								}

								//Change of 26-11-2020 for Edit record

								pViewData[i].EDIT_START_DATE = pViewData[i].START_DATE__C;
								pViewData[i].EDIT_END_DATE = pViewData[i].END_DATE__C;

								// chanages for modiefied bill price / bill roll / bill cut rpice 
								if (pViewData[i].BILLING_PRICE__C !== null || pViewData[i].BILLING_PRICE__C !== undefined) {
									if (pViewData[i].APPROVAL_STATUS__C === "1" && pViewData[i].MODIFIED_BY__C ===
										that.loggedInUser && that.selectedCat == "Accessories") {
										pViewData[i].BILLING_PRICE__C = pViewData[i].REQUESTED_BILLING_PRICE__C;
									} else {
										pViewData[i].BILLING_PRICE__C = pViewData[i].BILLING_PRICE__C;
									}
									if (pViewData[i].APPROVAL_STATUS__C === "1" && pViewData[i].MODIFIED_BY__C ===
										that.loggedInUser && (that.selectedCat === "RevWood" || that.selectedCat === "SolidWood" || that.selectedCat ===
											"TecWood" || that.selectedCat === "Resilient Tile" || that.selectedCat === "Carpet Tile" || that.selectedCat === "Tile")
									) {
										pViewData[i].BILLING_PRICE__C = pViewData[i].REQUESTED_BILLING_PRICE_CARTON__C;
									} else {
										pViewData[i].BILLING_PRICE__C = pViewData[i].BILLING_PRICE__C;
									}
								}

								if (pViewData[i].BILLING_PRICE_ROLL__C !== null || pViewData[i].BILLING_PRICE_ROLL__C !== undefined) {
									if (pViewData[i].APPROVAL_STATUS__C === "1" && pViewData[i].MODIFIED_BY__C ===
										that.loggedInUser) {
										pViewData[i].BILLING_PRICE_ROLL__C = pViewData[i].REQUESTED_BILLING_PRICE_ROLL__C;
									} else {
										pViewData[i].BILLING_PRICE_ROLL__C = pViewData[i].BILLING_PRICE_ROLL__C;
									}
								}

								if (pViewData[i].BILLING_PRICE_CUT__C !== null || pViewData[i].BILLING_PRICE_CUT__C !== undefined) {
									if (pViewData[i].APPROVAL_STATUS__C === "1" && pViewData[i].MODIFIED_BY__C ===
										that.loggedInUser) {
										pViewData[i].BILLING_PRICE_CUT__C = pViewData[i].REQUESTED_BILLING_PRICE_CUT__C;
									} else {
										pViewData[i].BILLING_PRICE_CUT__C = pViewData[i].BILLING_PRICE_CUT__C;
									}
								}
								// chanages for modiefied bill price / bill roll / bill cut rpice 	

								//changes for check created limited price record exist or not
								pViewData[i].ISLIMITEDPRICERECORD = pViewData[i].CPL_PRICE_ID__C.length === 13 ? true : false;
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

								if (pViewData[i].BILLING_PRICE_ROLL__C === null) {
									pViewData[i].PRICE_LEVEL_ROLL__C = "N/A";
								} else if (pViewData[i].BILLING_PRICE_ROLL__C) { // added condition for Buyers group fields - Pratik - 30/10
									if (pViewData[i].BUYING_GROUP_PRICE__C === "X" && pViewData[i].BUYING_GROUP_NUMBER__C !== null && pViewData[i].BUYING_GROUP_NUMBER__C !== ""
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
									if (pViewData[i].BUYING_GROUP_PRICE__C === "X" && pViewData[i].BUYING_GROUP_NUMBER__C !== null && pViewData[i].BUYING_GROUP_NUMBER__C !== ""
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
										} else if (pViewData[i].BILLING_PRICE_CUT__C === "0" && pViewData[i].TM1_CUT_PRICE__C === "0" && pViewData[i].TM2_CUT_PRICE__C ===
											"0" && pViewData[i].TM3_CUT_PRICE__C === "0" && pViewData[i].DM_CUT_PRICE__C === "0" && pViewData[i].RVP_CUT_PRICE__C ===
											"0") {
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
									if (that.selectedCat !== "Cushion") {
										//Added by Karan on 03.12.2020 to stop the existing logic for Cushion story 2292 end
										if (pViewData[i].BUYING_GROUP_PRICE__C === "X" && pViewData[i].BUYING_GROUP_NUMBER__C !== null && pViewData[i].BUYING_GROUP_NUMBER__C !== ""
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
								var editCheck = false;

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
								}

								if (pViewData[i].APPROVAL_STATUS__C === "4") {
									pViewData[i].END_DATE__C = "/Date(" + new Date().getTime() + ")/";
								}

								//Edit Menu options Item Access Check - 2281
								if (pViewData[i].APPROVAL_STATUS__C === "1" || pViewData[i].APPROVAL_STATUS__C === "4") {
									if (pViewData[i].APPROVAL_STATUS__C === "1") {
										pViewData[i].EDITMENUCHECK = true;
										pViewData[i].REMOVEMENUCHECK = true;

									} else if (pViewData[i].APPROVAL_STATUS__C === "4") {
										pViewData[i].EDITMENUCHECK = false;
										pViewData[i].REMOVEMENUCHECK = true;
									}
								} else {
									//Edit Menu options Item Access Check - 2281
									// Added by Binay
									if (pViewData[i].INFORMATION.includes("G") === false && pViewData[i].BUYING_GROUP_NUMBER__C !== null && (pViewData[i].BUYING_GROUP_PRICE__C !==
											"X" || pViewData[i].BUYING_GROUP_PRICE__C === null)) {
										pViewData[i].EDITCURRMENUCHECK = true;
										pViewData[i].EDITLIMITEDMENUCHECK = true;
										pViewData[i].REMOVECURRMENUCHECK = true;
									} else if (pViewData[i].INFORMATION.includes("G") === true && pViewData[i].BUYING_GROUP_NUMBER__C !== null && (pViewData[i]
											.BUYING_GROUP_PRICE__C !==
											"X" || pViewData[i].BUYING_GROUP_PRICE__C === null)) {
										pViewData[i].EDITCURRMENUCHECK = false;
										pViewData[i].EDITLIMITEDMENUCHECK = false;
										pViewData[i].REMOVECURRMENUCHECK = false;
										pViewData[i].REMOVEMENUCHECK = false;
									} else if (pViewData[i].INFORMATION.includes("G") === true && pViewData[i].BUYING_GROUP_NUMBER__C !== null && pViewData[i]
										.BUYING_GROUP_PRICE__C ===
										"X") {
										pViewData[i].EDITCURRMENUCHECK = true;
										pViewData[i].EDITLIMITEDMENUCHECK = true;
										pViewData[i].REMOVECURRMENUCHECK = false;
										pViewData[i].REMOVEMENUCHECK = false;
									} else if (pViewData[i].INFORMATION.includes("G") === false && pViewData[i].BUYING_GROUP_NUMBER__C !== null && pViewData[i]
										.BUYING_GROUP_PRICE__C ===
										"X") {
										pViewData[i].EDITCURRMENUCHECK = true;
										pViewData[i].EDITLIMITEDMENUCHECK = true;
										pViewData[i].REMOVECURRMENUCHECK = true;
									} else if (pViewData[i].INFORMATION.includes("G") === true && pViewData[i].BUYING_GROUP_NUMBER__C === null && pViewData[i]
										.PRICE_GRID_UNIQUE_KEY__C ===
										null) {
										pViewData[i].EDITCURRMENUCHECK = true;
										pViewData[i].EDITLIMITEDMENUCHECK = true;
										pViewData[i].REMOVECURRMENUCHECK = false;
										pViewData[i].REMOVEMENUCHECK = false;
									} else if (pViewData[i].INFORMATION.includes("G") === false && pViewData[i].BUYING_GROUP_NUMBER__C === null && pViewData[i]
										.PRICE_GRID_UNIQUE_KEY__C ===
										null) {
										pViewData[i].EDITCURRMENUCHECK = true;
										pViewData[i].EDITLIMITEDMENUCHECK = true;
										pViewData[i].REMOVECURRMENUCHECK = true;
									} else if (pViewData[i].INFORMATION.includes("G") === true && pViewData[i].BUYING_GROUP_NUMBER__C === null && pViewData[i]
										.PRICE_GRID_UNIQUE_KEY__C !==
										null) {
										pViewData[i].EDITCURRMENUCHECK = true;
										pViewData[i].EDITLIMITEDMENUCHECK = true;
										pViewData[i].REMOVECURRMENUCHECK = false;
										pViewData[i].REMOVEMENUCHECK = false;
									} else if (pViewData[i].INFORMATION.includes("G") === false && pViewData[i].BUYING_GROUP_NUMBER__C === null && pViewData[i]
										.PRICE_GRID_UNIQUE_KEY__C !==
										null) {
										pViewData[i].EDITCURRMENUCHECK = true;
										pViewData[i].EDITLIMITEDMENUCHECK = true;
										pViewData[i].REMOVECURRMENUCHECK = true;
									}
									// Added by Binay
								}
							}

							function SortByName(data) {
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
							}

							var currentUser = that.loggedInUser;
							var blueData = pViewData.filter(function (a) {
								return (a.APPROVAL_STATUS__C == "1" || a.APPROVAL_STATUS__C == "4") && a.MODIFIED_BY__C == currentUser;
							});

							SortByName(blueData);

							var redData = pViewData.filter(function (a) {
								return (a.APPROVAL_STATUS__C == "2" || a.APPROVAL_STATUS__C == "3") && a.MODIFIED_BY__C == currentUser;
							});

							SortByName(redData);

							var greenData = pViewData.filter(function (a) {
								return a.APPROVAL_STATUS__C == "A" && a.MODIFIED_BY__C == currentUser;
							});

							SortByName(greenData);

							var purpleData = pViewData.filter(function (a) {
								return a.APPROVAL_STATUS__C == "F" && a.MODIFIED_BY__C == currentUser;
							});

							SortByName(purpleData);
							
							var otherUserData = pViewData.filter(function (a) { return !(a.APPROVAL_STATUS__C === "1" && a.CPL_PRICE_ID__C.length === 13 && a.MODIFIED_BY__C !== currentUser)});
							
							var blackData = otherUserData.filter(function (el) {
                                return !blueData.includes(el) && !redData.includes(el) && !greenData.includes(el) && !purpleData.includes(el);
                            });
							/*var blackData = pViewData.filter(function (el) {
								return !blueData.includes(el) && !redData.includes(el) && !greenData.includes(el) && !purpleData.includes(el) && ((el.APPROVAL_STATUS__C == "1" || el.APPROVAL_STATUS__C == "4" || el.APPROVAL_STATUS__C == "2" || el.APPROVAL_STATUS__C == "3" || el.APPROVAL_STATUS__C == "A" || el.APPROVAL_STATUS__C == "F") && el.MODIFIED_BY__C !== currentUser);
							});*/
							

							SortByName(blackData);

							var allData = blueData.concat(redData).concat(greenData).concat(purpleData).concat(blackData);

							pViewModel.setData(allData);

							sap.ui.getCore().setModel(pViewModel, "pViewModel");
							that.getView().setModel(pViewModel, "pViewModel");

							sap.ui.getCore().busyIndicator.close();	
							that.bindRecords();
							that.getView().byId("sortButton").setEnabled(true);
							that.getView().byId("sortButton2").setEnabled(true);
						},
						error: function (error) {
							console.log(error);
							that.getView().byId("sortButton").setEnabled(false);
							that.getView().byId("sortButton2").setEnabled(false);
							sap.ui.getCore().busyIndicator.close();
						}
					});
				}

			}
		},

		bindRecords: function () {
			var pViewData = this.getView().getModel("pViewModel").getData();
			var oAccountDetails = this.getView().byId("lblAccountNO");
			if (this.selectedCat === "Cushion") {
				if(pViewData.length > 0) {
				oAccountDetails.setText(pViewData[0].ACCOUNT_NAME__C + " (" + pViewData[0].ACCOUNT__C + ")");
				}
			} else {
				oAccountDetails.setText("");
			}

			var oTable = this.getView().byId("list");
			oTable.removeAllItems();
			oTable.removeAllColumns();

			var oLabel1 = new sap.m.Label({
				text: "Add / Edit / Remove"
			}).addStyleClass("clrBlue").addStyleClass("sapUiSmallMarginBeginEnd");

			var tLabel1 = new sap.m.Label({
				text: " || "
			});
			var tLabel2 = new sap.m.Label({
				text: " || "
			});
			var tLabel3 = new sap.m.Label({
				text: " || "
			});

			var oLabel2 = new sap.m.Label({
				text: "Pending approval"
			}).addStyleClass("clrRed").addStyleClass("sapUiSmallMarginBeginEnd");

			var oLabel3 = new sap.m.Label({
				text: "In Process"
			}).addStyleClass("clrGreen").addStyleClass("sapUiSmallMarginBeginEnd");

			var oLabel4 = new sap.m.Label({
				text: "Notify Sales Ops"
			}).addStyleClass("clrPurple").addStyleClass("sapUiSmallMarginBeginEnd");

			var oHBox = new sap.m.HBox();
			oHBox.insertItem(oLabel1, 1);
			oHBox.insertItem(tLabel1, 2);
			oHBox.insertItem(oLabel2, 3);
			oHBox.insertItem(tLabel2, 4);
			oHBox.insertItem(oLabel3, 5);
			oHBox.insertItem(tLabel3, 6);
			oHBox.insertItem(oLabel4, 7);

			var oOverFlow = new sap.m.OverflowToolbar();
			oOverFlow.addContent(oHBox);
			oTable.setInfoToolbar(oOverFlow); // Info toolbar can be added later. Not on current functionality // TO BE ADDED

			var tHeader = [];
			this.primaryCols = this.gridmeta.filter((a) => (a.IS_PRIMARY_DISPLAY__C == "X" && a['PRODUCT_CATEGORY__C'] == this.selectedCat)).sort(
				this.sortGridMeta);

			// added for Menu Button Header.. 
			if (this.primaryCols.length > 0) {
				var oColumn = new sap.m.Column({
					header: new sap.m.Label({
						text: ""
					})
				});
				oTable.addColumn(oColumn);
			}
			for (var i = 0; i < this.primaryCols.length; i++) {
				var oColumn = new sap.m.Column({
					// width: this.primaryCols[i]['Column_Width__c'],
					header: new sap.m.Label({
						text: this.primaryCols[i]['SHORT_LABEL__C']
					})
				});
				oTable.addColumn(oColumn);
				var tData = {
					"key": this.primaryCols[i].PRIMARY_DISPLAY_ORDER__C,
					"header": this.primaryCols[i].SHORT_LABEL__C,
					"field": this.primaryCols[i].FIELD_API_NAME__C.toUpperCase(),
					"type": this.primaryCols[i].DATA_TYPE__C
				};
				tHeader.push(tData);
			}

			if (sap.ui.getCore().byId("infoBtn")) {
				sap.ui.getCore().byId("infoBtn").destroy();
			}
			var oButton = new sap.m.Button("infoBtn", {
				icon: "sap-icon://information",
				type: "Transparent",
			});

			var oText1 = new sap.m.Text({
				text: "Ɪ"
			}).addStyleClass("clspopovertext1").addStyleClass("sapUiTinyMargin");
			var oText2 = new sap.m.Text({
				text: "Inherited price from parent list"
			}).addStyleClass("clspopovertext2").addStyleClass("sapUiTinyMargin");

			var oText3 = new sap.m.Text({
				text: "G"
			}).addStyleClass("clspopovertext1").addStyleClass("sapUiTinyMargin");
			var oText4 = new sap.m.Text({
				text: "Inherited price from group price"
			}).addStyleClass("clspopovertext2").addStyleClass("sapUiTinyMargin");

			var oText5 = new sap.m.Text({
				text: "Q"
			}).addStyleClass("clspopovertext1").addStyleClass("sapUiTinyMargin");
			var oText6 = new sap.m.Text({
				text: "Prices listed have a minimum quantity"
			}).addStyleClass("clspopovertext2").addStyleClass("sapUiTinyMargin");

			var oText7 = new sap.m.Text({
				text: "C"
			}).addStyleClass("clspopovertext1").addStyleClass("sapUiTinyMargin");
			var oText8 = new sap.m.Text({
				text: "Cut-at-roll length has a minimum quantity"
			}).addStyleClass("clspopovertext2").addStyleClass("sapUiTinyMargin");

			var oText9 = new sap.m.Text({
				text: "$"
			}).addStyleClass("clspopovertext1").addStyleClass("sapUiTinyMargin");
			var oText10 = new sap.m.Text({
				text: "Billing price does not match net price"
			}).addStyleClass("clspopovertext2").addStyleClass("sapUiTinyMargin");

			var oFlex = new sap.m.FlexBox({
				direction: "Column",
				alighItems: "Start"
			});

			var oHBox1 = new sap.m.HBox();
			var oHBox2 = new sap.m.HBox();
			var oHBox3 = new sap.m.HBox();
			var oHBox4 = new sap.m.HBox();
			var oHBox5 = new sap.m.HBox();

			oHBox1.insertItem(oText1, 1);
			oHBox1.insertItem(oText2, 2);
			oHBox2.insertItem(oText3, 1);
			oHBox2.insertItem(oText4, 2);
			oHBox3.insertItem(oText5, 1);
			oHBox3.insertItem(oText6, 2);
			oHBox4.insertItem(oText7, 1);
			oHBox4.insertItem(oText8, 2);
			oHBox5.insertItem(oText9, 1);
			oHBox5.insertItem(oText10, 2);

			oFlex.insertItem(oHBox5);
			oFlex.insertItem(oHBox4);
			oFlex.insertItem(oHBox3);
			oFlex.insertItem(oHBox2);
			oFlex.insertItem(oHBox1);

			if (sap.ui.getCore().byId("resPopOver")) {
				sap.ui.getCore().byId("resPopOver").destroy();
			}
			var oResPopOver = new sap.m.ResponsivePopover("resPopOver", {
				showHeader: false,
				placement: "Left"
			}).addStyleClass("clspopover");
			oResPopOver.addContent(oFlex);
			oButton.addDependent(oResPopOver);

			function _showPopover(targetControl, popover) {
				this._timeId = setTimeout(() => popover.openBy(targetControl), 500);
			}

			function _clearPopover(popover) {
				clearTimeout(this._timeId) || popover.close();
			}

			function attachPopoverOnMouseover(targetControl, popover) {
				targetControl.addEventDelegate({
					onmouseover: _showPopover.bind(this, targetControl, popover),
					onmouseout: _clearPopover.bind(this, popover),
				}, this);
			}

			attachPopoverOnMouseover(sap.ui.getCore().byId("infoBtn"), sap.ui.getCore().byId("resPopOver"));

			if (this.primaryCols.length > 0) {
				var oColumn = new sap.m.Column({
					header: oButton
				});
				oTable.addColumn(oColumn);
				var tData = {
					"key": this.primaryCols.length,
					"header": "",
					"field": "INFORMATION",
					"type": "InfoButton"
				};
				tHeader.push(tData);
			}

			sap.ui.getCore().getModel("configModel").setProperty("/mHeader", tHeader);
			sap.ui.getCore().getModel("configModel").setProperty("/selectedCat", this.selectedCat);

			var numberFields = tHeader.filter(function (c) {
				if (c.type === "Currency") {
					return c;
				}
			});

			var dateFields = tHeader.filter(function (d) {
				if (d.type === "Date") {
					return d;
				}
			});

			for (var i = 0; i < pViewData.length; i++) {
				for (var j = 0; j < numberFields.length; j++) {
					if (pViewData[i][numberFields[j].field] !== null && pViewData[i][numberFields[j].field] !== "") {
						pViewData[i][numberFields[j].field] = parseFloat(pViewData[i][numberFields[j].field]);
					}
				}
				for (var k = 0; k < dateFields.length; k++) {
					if (pViewData[i][dateFields[k].field] !== null && pViewData[i][dateFields[k].field] !== "") {
						var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
							pattern: "MM/dd/yy"
						});
						var date = pViewData[i][dateFields[k].field];
						if (date.split("(").length > 1) {
							var ms = date.split("(")[1].split(")")[0];
							//Added by Karan on 03.12.2020 to clear end date if year >= 4000 start for bug 3740 and story 2292
							var dateNew = new Date(parseInt(ms));
							var year = dateNew.getFullYear();
							pViewData[i][dateFields[k].field] = year >= 4000 ? "" : dateFormat.format(dateNew);
							//Added by Karan on 03.12.2020 to clear end date if year >= 4000 end for bug 3740 and story 2292
							//Added by Karan to clear end date if year > 4000 end
							//Commented by Karan on 03.12.2020 to pass date only if year < 4000 start bug 3740 and story 2292
							// pViewData[i][dateFields[k].field] = dateFormat.format(new Date(parseInt(ms)));
							//Commented by Karan on 03.12.2020 to pass date only if year < 4000 end bug 3740 and story 2292
						}
						if (date.split("-").length > 1) {
							pViewData[i][dateFields[k].field] = dateFormat.format(new Date(date));
						}
						//updated - Pratik//
					}
				}
			}

			var oCell = [];

			//Edit Menu options Item Access Check - 2281
			if (tHeader.length > 0) {

				var oMenuBtn = new sap.m.MenuButton({
					menu: new sap.m.Menu({
						items: [
							new sap.m.MenuItem({
								text: "Edit Current Price",
								icon: "sap-icon://edit",
								visible: "{= ${pViewModel>EDITCURRMENUCHECK} === true}",
								press: [this.onItemEdit, this]
							}), new sap.m.MenuItem({
								text: "Create Limited Time Price",
								icon: "sap-icon://create",
								visible: "{= ${pViewModel>EDITLIMITEDMENUCHECK} === true}",
								press: [this.onItemEditLimited, this]
							}),
							new sap.m.MenuItem({
								text: "Remove Current Price",
								icon: "sap-icon://delete",
								visible: "{= ${pViewModel>REMOVECURRMENUCHECK} === true}",
								press: [this.onItemRemovePrice, this]
							}),
							new sap.m.MenuItem({
								text: "Edit",
								icon: "sap-icon://edit",
								visible: "{= ${pViewModel>EDITMENUCHECK} === true}",
								press: [this.onItemEdit, this]
							}),
							new sap.m.MenuItem({
								text: "Remove",
								icon: "sap-icon://delete",
								visible: "{= ${pViewModel>REMOVEMENUCHECK} === true}",
								press: [this.onItemRemovePrice, this]
							}),
						]
					}).addStyleClass("clsmenuitem"),

					visible: "{= ${pViewModel>EDITACCESS} === 'true'}"
				});

				oCell.push(oMenuBtn);

			}
			//Edit Menu options Item Access Check - 2281

			//tHeader.sort(that.sortTHeader);
			for (var j = 0; j < tHeader.length; j++) {
				if (tHeader[j].type === "Currency") {
					var cell1 = new sap.m.Text({
						text: "$ " + "{pViewModel>" + tHeader[j].field.replace('PRODUCT__R.', '') + "}"
					});
					oCell.push(cell1);
				} else if (tHeader[j].type === "InfoButton") {
					var cell1 = new sap.m.Text({
						text: "{pViewModel>" + tHeader[j].field + "}"
					});
					oCell.push(cell1);
				} else {
					var cell1 = new sap.m.Text({
						text: "{pViewModel>" + tHeader[j].field.replace('PRODUCT__R.', '') + "}"
					});
					oCell.push(cell1);
				}
			}
			var aColList = new sap.m.ColumnListItem({
				cells: oCell,
				type: "Navigation",
				press: [this.onSelectionChange, this]
			});
			oTable.bindItems("pViewModel>/", aColList);

			//changes for Sorting by Blue color 
			var that = this;
			if (pViewData.length > 0) {

				for (var i = 0; i < oTable.getModel("pViewModel").getData().length; i++) {
					if ((oTable.getModel("pViewModel").getData()[i].APPROVAL_STATUS__C == "1" || oTable.getModel("pViewModel").getData()[i].APPROVAL_STATUS__C ==
							"4") && oTable.getModel("pViewModel").getData()[i].MODIFIED_BY__C == that.loggedInUser) {
						for (var j = 0; j < oTable.getItems().length; j++) {
							if (i == j) {
								for (var k = 0; k < oTable.getItems()[j].getCells().length; k++) {
									oTable.getItems()[j].getCells()[k].addStyleClass("clrBlue");
								}
							}
						}
					} else if ((oTable.getModel("pViewModel").getData()[i].APPROVAL_STATUS__C == "2" || oTable.getModel("pViewModel").getData()[i].APPROVAL_STATUS__C ==
							"3") && oTable.getModel("pViewModel").getData()[i].MODIFIED_BY__C == that.loggedInUser) {
						for (var j = 0; j < oTable.getItems().length; j++) {
							if (i == j) {
								for (var k = 0; k < oTable.getItems()[j].getCells().length; k++) {
									oTable.getItems()[j].getCells()[k].addStyleClass("clrRed");
								}
							}
						}
					} else if (oTable.getModel("pViewModel").getData()[i].APPROVAL_STATUS__C == "A" && oTable.getModel("pViewModel").getData()[i].MODIFIED_BY__C ==
						that.loggedInUser) {
						for (var j = 0; j < oTable.getItems().length; j++) {
							if (i == j) {
								for (var k = 0; k < oTable.getItems()[j].getCells().length; k++) {
									oTable.getItems()[j].getCells()[k].addStyleClass("clrGreen");
								}
							}
						}
					} else if (oTable.getModel("pViewModel").getData()[i].APPROVAL_STATUS__C == "F" && oTable.getModel("pViewModel").getData()[i].MODIFIED_BY__C ==
						that.loggedInUser) {
						for (var j = 0; j < oTable.getItems().length; j++) {
							if (i == j) {
								for (var k = 0; k < oTable.getItems()[j].getCells().length; k++) {
									oTable.getItems()[j].getCells()[k].addStyleClass("clrPurple");
								}
							}
						}
					}
				}
			}
			//changes for Sorting by Blue color

			////////

			var oTable2 = this.getView().byId("list2");
			oTable2.removeAllItems();

			var listFilter = tHeader.filter(function (a) {
				return a.key == "1" || a.key == "2" || a.key == "3" || a.key == "4" || a.key == tHeader.length - 1 + "";
			});
			var lData = [];
			if (listFilter.length > 0) {
				for (var k = 0; k < pViewData.length; k++) {
					var f0 = listFilter[0].field.replace('PRODUCT__R.', '');
					var f1 = listFilter[1].field.replace('PRODUCT__R.', '');
					var f2 = listFilter[2].field.replace('PRODUCT__R.', '');
					var f3 = listFilter[3].header + ":" + listFilter[3].field.replace('PRODUCT__R.', '');
					var f4 = listFilter[4].header + ":" + listFilter[4].field.replace('PRODUCT__R.', ''); //  Added by Ronak; Date: 17-Dec-2020; Bug: 3906; For BILLING_PRICE_CUT__C
					var data = {
						"intro": pViewData[k][f2],
						"title": pViewData[k][f1],
						"number": pViewData[k][f0],
						"numUnit": pViewData[k][f3],
						"firstStatus": pViewData[k][f4]
					};
					lData.push(data);
				}
			}
			var lsModel = new JSONModel();

			lsModel.setData(lData);
			this.getView().setModel(lsModel, "listModel");
		},

		//Edit Popup
		onItemEdit: function (oEvent) {
			// console.log("On Item Edit");
			var selectedRow = oEvent.getSource().getParent().getParent().getParent();
			var editData = {
				"cell1": selectedRow.getAggregation("cells")[1].getText(),
				"cell2": selectedRow.getAggregation("cells")[2].getText(),
				"cell3": selectedRow.getAggregation("cells")[3].getText(),
				"cell4": selectedRow.getAggregation("cells")[4].getText(),
				"cell5": selectedRow.getAggregation("cells")[5].getText(),
				"cell6": selectedRow.getAggregation("cells")[6].getText(),
				"cell7": selectedRow.getAggregation("cells")[7].getText()
			}
			this.editData = editData;
			var that = this;
			that.openDialogPgSurface(editData);
		},

		openDialogPgSurface: function (editData) {
			// debugger;
			var that = this;
			var pViewModel = this.getView().getModel("pViewModel");
			var pViewData = pViewModel.getData();

			var tHeader = sap.ui.getCore().getModel("configModel").getProperty("/mHeader");

			var editPriceData = pViewData.filter(function (a) {
				a[tHeader[1].field.replace('PRODUCT__R.', '')] = typeof (a[tHeader[1].field.replace('PRODUCT__R.', '')]) === "number" ? "$ " + a[
					tHeader[1].field.replace('PRODUCT__R.', '')].toString() : a[tHeader[1].field.replace('PRODUCT__R.', '')];
				a[tHeader[2].field.replace('PRODUCT__R.', '')] = typeof (a[tHeader[2].field.replace('PRODUCT__R.', '')]) === "number" ? "$ " + a[
					tHeader[2].field.replace('PRODUCT__R.', '')].toString() : a[tHeader[2].field.replace('PRODUCT__R.', '')];
				a[tHeader[3].field.replace('PRODUCT__R.', '')] = typeof (a[tHeader[3].field.replace('PRODUCT__R.', '')]) === "number" ? "$ " + a[
					tHeader[3].field.replace('PRODUCT__R.', '')].toString() : a[tHeader[3].field.replace('PRODUCT__R.', '')];
				a[tHeader[4].field.replace('PRODUCT__R.', '')] = typeof (a[tHeader[4].field.replace('PRODUCT__R.', '')]) === "number" ? "$ " + a[
					tHeader[4].field.replace('PRODUCT__R.', '')].toString() : a[tHeader[4].field.replace('PRODUCT__R.', '')];
				a[tHeader[5].field.replace('PRODUCT__R.', '')] = typeof (a[tHeader[5].field.replace('PRODUCT__R.', '')]) === "number" ? "$ " + a[
					tHeader[5].field.replace('PRODUCT__R.', '')].toString() : a[tHeader[5].field.replace('PRODUCT__R.', '')];
				a[tHeader[6].field.replace('PRODUCT__R.', '')] = typeof (a[tHeader[6].field.replace('PRODUCT__R.', '')]) === "number" ? "$ " + a[
					tHeader[6].field.replace('PRODUCT__R.', '')].toString() : a[tHeader[6].field.replace('PRODUCT__R.', '')];

				return editData.cell1 == a[tHeader[0].field.replace('PRODUCT__R.', '')] && editData.cell2 == a[tHeader[1].field.replace(
					'PRODUCT__R.', '')] && editData.cell3 == a[tHeader[2].field.replace('PRODUCT__R.', '')] && editData.cell4 == a[tHeader[3].field
					.replace('PRODUCT__R.', '')] && editData.cell5 == a[tHeader[4].field.replace('PRODUCT__R.', '')] && editData.cell6 == a[
					tHeader[5].field.replace('PRODUCT__R.', '')] && editData.cell7 == a[tHeader[6].field.replace('PRODUCT__R.', '')]
			});

			editPriceData[0].EditRollPrice = typeof (editPriceData[0].BILLING_PRICE_ROLL__C) === "string" ? editPriceData[0].BILLING_PRICE_ROLL__C
				.split("$ ").length > 0 ? parseFloat(editPriceData[0].BILLING_PRICE_ROLL__C.split("$ ")[1]) : parseFloat(editPriceData[0].BILLING_PRICE_ROLL__C) :
				editPriceData[0].BILLING_PRICE_ROLL__C
			editPriceData[0].EditCutPrice = typeof (editPriceData[0].BILLING_PRICE_CUT__C) === "string" ? editPriceData[0].BILLING_PRICE_CUT__C
				.split("$ ").length > 0 ? parseFloat(editPriceData[0].BILLING_PRICE_CUT__C.split("$ ")[1]) : parseFloat(editPriceData[0].BILLING_PRICE_CUT__C) :
				editPriceData[0].BILLING_PRICE_CUT__C;
			editPriceData[0].EditCartonPrice = typeof (editPriceData[0].BILLING_PRICE__C) === "string" ? editPriceData[0].BILLING_PRICE__C
				.split("$ ").length > 0 ? parseFloat(editPriceData[0].BILLING_PRICE__C.split("$ ")[1]) : parseFloat(editPriceData[0].BILLING_PRICE__C) :
				editPriceData[0].BILLING_PRICE__C;

			editPriceData[0].EditEachPrice = typeof (editPriceData[0].BILLING_PRICE__C) === "string" ? editPriceData[0].BILLING_PRICE__C
				.split("$ ").length > 0 ? parseFloat(editPriceData[0].BILLING_PRICE__C.split("$ ")[1]) : parseFloat(editPriceData[0].BILLING_PRICE__C) :
				editPriceData[0].BILLING_PRICE__C;
			var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});

			for (var i = 0; i < pViewData.length; i++) {
				if (pViewData[i].CPL_PRICE_ID__C !== null) {
					if (pViewData[i].CPL_PRICE_ID__C === editPriceData[0].CPL_PRICE_ID__C) {
						if (pViewData[i].EDIT_START_DATE != null) {
							if (pViewData[i].EDIT_START_DATE.split("(").length > 1) {
								var startdate = pViewData[i].EDIT_START_DATE.split("(")[1].split(")")[0];
								pViewData[i].EDIT_START_DATE = dateFormat.format(new Date(parseInt(startdate)));
								editPriceData[0].EDIT_START_DATE = pViewData[i].EDIT_START_DATE;
							}
						}
						if (pViewData[i].EDIT_END_DATE != null) {
							if (pViewData[i].EDIT_END_DATE.split("(").length > 1) {
								var enddate = pViewData[i].EDIT_END_DATE.split("(")[1].split(")")[0];
								pViewData[i].EDIT_END_DATE = dateFormat.format(new Date(parseInt(enddate)));
								editPriceData[0].EDIT_END_DATE = pViewData[i].EDIT_END_DATE;
							}
						}
					}
				}
			}

			var editModel = new JSONModel(editPriceData);
			this.getView().setModel(editModel, "editModel");

			if (!this._oDialogPGsurface) {
				this._oDialogPGsurface = sap.ui.xmlfragment("cf.cpl.fragments.EditCurrPrice", this);
				this.getView().addDependent(this._oDialogPGsurface);
			}
			this._oDialogPGsurface.setModel(editModel, "editModel");
			this._oDialogPGsurface.open();

			sap.ui.getCore().byId("sbsurfaceLevel").setSelectedItem("-1");
			sap.ui.getCore().byId("sbAccLevel").setSelectedItem("-1");
			sap.ui.getCore().byId("sbBGLevel").setSelectedItem("-1");

			var txtSFCurrPrice = sap.ui.getCore().byId("txtSFCurrPrice");
			var txtHFCurrPrice = sap.ui.getCore().byId("txtHFCurrPrice");
			var txtACCurrPrice = sap.ui.getCore().byId("txtACCurrPrice");
			// var txtBGurrPrice = sap.ui.getCore().byId("txtBGurrPrice");

			var txtRoll = sap.ui.getCore().byId("txtRoll");
			var txtCut = sap.ui.getCore().byId("txtCut");
			var txtCarton = sap.ui.getCore().byId("txtCarton");
			var txtEach = sap.ui.getCore().byId("txtEach");

			var lblRoll = sap.ui.getCore().byId("lblRoll");
			var lblCut = sap.ui.getCore().byId("lblCut");
			var lblCarton = sap.ui.getCore().byId("lblCarton");
			var lblEach = sap.ui.getCore().byId("lblEach");

			var sbsurfaceLevel = sap.ui.getCore().byId("sbsurfaceLevel");
			var sbAccLevel = sap.ui.getCore().byId("sbAccLevel");
			var sbBGLevel = sap.ui.getCore().byId("sbBGLevel");

			// var editType = "PG";

			if (that.selectedCat === "Residential Broadloom" || that.selectedCat === "Commercial Broadloom" || that.selectedCat ===
				"Resilient Sheet") {

				txtSFCurrPrice.setVisible(true);
				txtHFCurrPrice.setVisible(false);
				txtACCurrPrice.setVisible(false);

				txtRoll.setVisible(true);
				txtCut.setVisible(true);
				txtCarton.setVisible(false);
				txtEach.setVisible(false);

				lblRoll.setVisible(true);
				lblCut.setVisible(true);
				lblCarton.setVisible(false);
				lblEach.setVisible(false);

				//CPL Edit & Edit Menu options - 2281
				if (editPriceData[0].INFORMATION.includes("G") === false && editPriceData[0].BUYING_GROUP_NUMBER__C !== null && editPriceData[0].BUYING_GROUP_NUMBER__C !==
					"" && (editPriceData[0].BUYING_GROUP_PRICE__C !==
						"X" || editPriceData[0].BUYING_GROUP_PRICE__C === null)) {
					sbBGLevel.setVisible(true);
					sbBGLevel.setEnabled(false);
					sbsurfaceLevel.setVisible(false);
					sbAccLevel.setVisible(false);
				} else if (editPriceData[0].INFORMATION.includes("G") === true && editPriceData[0].BUYING_GROUP_NUMBER__C !== null &&
					editPriceData[0].BUYING_GROUP_NUMBER__C !== "" &&
					(editPriceData[0].BUYING_GROUP_PRICE__C !== "X" || editPriceData[0].BUYING_GROUP_PRICE__C === null)) {
					sbBGLevel.setVisible(false);
					sbBGLevel.setEnabled(false);
					sbsurfaceLevel.setVisible(false);
					sbAccLevel.setVisible(false);
				} else if (editPriceData[0].INFORMATION.includes("G") === true && editPriceData[0].BUYING_GROUP_NUMBER__C !== null &&
					editPriceData[0].BUYING_GROUP_NUMBER__C !== "" &&
					editPriceData[0].BUYING_GROUP_PRICE__C ===
					"X") {
					sbBGLevel.setVisible(true);
					sbBGLevel.setEnabled(true);
					sbsurfaceLevel.setVisible(false);
					sbAccLevel.setVisible(false);
				} else if (editPriceData[0].INFORMATION.includes("G") === false && editPriceData[0].BUYING_GROUP_NUMBER__C !== null && editPriceData[0].BUYING_GROUP_NUMBER__C !==
					"" && editPriceData[0].BUYING_GROUP_PRICE__C ===
					"X") {
					sbBGLevel.setVisible(true);
					sbBGLevel.setEnabled(true);
					sbsurfaceLevel.setVisible(false);
					sbAccLevel.setVisible(false);
				} else if (editPriceData[0].INFORMATION.includes("G") === true && (editPriceData[0].BUYING_GROUP_NUMBER__C === null ||
						editPriceData[0].BUYING_GROUP_NUMBER__C === "") &&
					editPriceData[0].PRICE_GRID_UNIQUE_KEY__C ===
					null) {
					sbBGLevel.setVisible(false);
					sbsurfaceLevel.setVisible(true);
					sbsurfaceLevel.setEnabled(false);
					sbAccLevel.setVisible(false);
				} else if (editPriceData[0].INFORMATION.includes("G") === false && (editPriceData[0].BUYING_GROUP_NUMBER__C === null || editPriceData[0].BUYING_GROUP_NUMBER__C ===
						"") && editPriceData[0].PRICE_GRID_UNIQUE_KEY__C ===
					null) {
					sbBGLevel.setVisible(false);
					sbsurfaceLevel.setVisible(true);
					sbsurfaceLevel.setEnabled(false);
					sbAccLevel.setVisible(false);
				} else if (editPriceData[0].INFORMATION.includes("G") === true && (editPriceData[0].BUYING_GROUP_NUMBER__C === null ||
						editPriceData[0].BUYING_GROUP_NUMBER__C === "") &&
					editPriceData[0].PRICE_GRID_UNIQUE_KEY__C !==
					null) {
					sbBGLevel.setVisible(false);
					sbsurfaceLevel.setVisible(true);
					sbsurfaceLevel.setVisible(true);
					sbAccLevel.setVisible(false);
				} else if (editPriceData[0].INFORMATION.includes("G") === false && (editPriceData[0].BUYING_GROUP_NUMBER__C === null || editPriceData[0].BUYING_GROUP_NUMBER__C ===
						"") && editPriceData[0].PRICE_GRID_UNIQUE_KEY__C !==
					null) {
					sbBGLevel.setVisible(false);
					sbsurfaceLevel.setVisible(true);
					sbsurfaceLevel.setVisible(true);
					sbAccLevel.setVisible(false);
				}

			} else if (that.selectedCat === "Carpet Tile" || that.selectedCat === "Tile" || that.selectedCat === "TecWood" || that.selectedCat ===
				"SolidWood" || that.selectedCat === "RevWood" || that.selectedCat === "Resilient Tile") {
				txtSFCurrPrice.setVisible(false);
				txtHFCurrPrice.setVisible(true);
				txtACCurrPrice.setVisible(false);

				txtRoll.setVisible(false);
				txtCut.setVisible(false);
				txtCarton.setVisible(true);
				txtEach.setVisible(false);

				lblRoll.setVisible(false);
				lblCut.setVisible(false);
				lblCarton.setVisible(true);
				lblEach.setVisible(false);

				if (editPriceData[0].INFORMATION.includes("G") === false && editPriceData[0].BUYING_GROUP_NUMBER__C !== null && editPriceData[0].BUYING_GROUP_NUMBER__C !==
					"" && editPriceData[0].BUYING_GROUP_PRICE__C !==
					"X") {
					sbBGLevel.setVisible(true);
					sbBGLevel.setEnabled(false);
					sbsurfaceLevel.setVisible(false);
					sbAccLevel.setVisible(false);
				} else if (editPriceData[0].INFORMATION.includes("G") === true && editPriceData[0].BUYING_GROUP_NUMBER__C !== null &&
					editPriceData[0].BUYING_GROUP_NUMBER__C !== "" &&
					editPriceData[0].BUYING_GROUP_PRICE__C !==
					"X") {
					sbBGLevel.setVisible(false);
					sbBGLevel.setEnabled(false);
					sbsurfaceLevel.setVisible(false);
					sbAccLevel.setVisible(false);
				} else if (editPriceData[0].INFORMATION.includes("G") === true && editPriceData[0].BUYING_GROUP_NUMBER__C !== null &&
					editPriceData[0].BUYING_GROUP_NUMBER__C !== "" &&
					editPriceData[0].BUYING_GROUP_PRICE__C ===
					"X") {
					sbBGLevel.setVisible(true);
					sbBGLevel.setEnabled(true);
					sbsurfaceLevel.setVisible(false);
					sbAccLevel.setVisible(false);
				} else if (editPriceData[0].INFORMATION.includes("G") === false && editPriceData[0].BUYING_GROUP_NUMBER__C !== null && editPriceData[0].BUYING_GROUP_NUMBER__C !==
					"" && editPriceData[0].BUYING_GROUP_PRICE__C ===
					"X") {
					sbBGLevel.setVisible(true);
					sbBGLevel.setEnabled(true);
					sbsurfaceLevel.setVisible(false);
					sbAccLevel.setVisible(false);
				} else if (editPriceData[0].INFORMATION.includes("G") === true && (editPriceData[0].BUYING_GROUP_NUMBER__C === null ||
						editPriceData[0].BUYING_GROUP_NUMBER__C === "") &&
					editPriceData[0].PRICE_GRID_UNIQUE_KEY__C ===
					null) {
					sbBGLevel.setVisible(false);
					sbsurfaceLevel.setVisible(true);
					sbsurfaceLevel.setEnabled(false);
					sbAccLevel.setVisible(false);
				} else if (editPriceData[0].INFORMATION.includes("G") === false && (editPriceData[0].BUYING_GROUP_NUMBER__C === null || editPriceData[0].BUYING_GROUP_NUMBER__C ===
						"") && editPriceData[0].PRICE_GRID_UNIQUE_KEY__C ===
					null) {
					sbBGLevel.setVisible(false);
					sbsurfaceLevel.setVisible(true);
					sbsurfaceLevel.setEnabled(false);
					sbAccLevel.setVisible(false);
				} else if (editPriceData[0].INFORMATION.includes("G") === true && (editPriceData[0].BUYING_GROUP_NUMBER__C === null ||
						editPriceData[0].BUYING_GROUP_NUMBER__C === "") &&
					editPriceData[0].PRICE_GRID_UNIQUE_KEY__C !==
					null) {
					sbBGLevel.setVisible(false);
					sbsurfaceLevel.setVisible(true);
					sbsurfaceLevel.setEnabled(true);
					sbAccLevel.setVisible(false);
				} else if (editPriceData[0].INFORMATION.includes("G") === false && (editPriceData[0].BUYING_GROUP_NUMBER__C === null || editPriceData[0].BUYING_GROUP_NUMBER__C ===
						"") && editPriceData[0].PRICE_GRID_UNIQUE_KEY__C !==
					null) {
					sbBGLevel.setVisible(false);
					sbsurfaceLevel.setVisible(true);
					sbsurfaceLevel.setEnabled(true);
					sbAccLevel.setVisible(false);
				}

			} else if (that.selectedCat === "Accessories") {
				txtSFCurrPrice.setVisible(false);
				txtHFCurrPrice.setVisible(false);
				txtACCurrPrice.setVisible(true);

				txtRoll.setVisible(false);
				txtCut.setVisible(false);
				txtCarton.setVisible(false);
				txtEach.setVisible(true);

				lblRoll.setVisible(false);
				lblCut.setVisible(false);
				lblCarton.setVisible(false);
				lblEach.setVisible(true);

				if (editPriceData[0].INFORMATION.includes("G") === false && editPriceData[0].BUYING_GROUP_NUMBER__C !== null && editPriceData[0].BUYING_GROUP_NUMBER__C !==
					"" && editPriceData[0].BUYING_GROUP_PRICE__C !==
					"X") {
					sbBGLevel.setVisible(true);
					sbBGLevel.setEnabled(false);
					sbsurfaceLevel.setVisible(false);
					sbAccLevel.setVisible(false);
				} else if (editPriceData[0].INFORMATION.includes("G") === true && editPriceData[0].BUYING_GROUP_NUMBER__C !== null &&
					editPriceData[0].BUYING_GROUP_NUMBER__C !== "" &&
					editPriceData[0].BUYING_GROUP_PRICE__C !==
					"X") {
					sbBGLevel.setVisible(false);
					sbBGLevel.setEnabled(false);
					sbsurfaceLevel.setVisible(false);
					sbAccLevel.setVisible(false);
				} else if (editPriceData[0].INFORMATION.includes("G") === true && editPriceData[0].BUYING_GROUP_NUMBER__C !== null &&
					editPriceData[0].BUYING_GROUP_NUMBER__C !== "" &&
					editPriceData[0].BUYING_GROUP_PRICE__C ===
					"X") {
					sbBGLevel.setVisible(true);
					sbBGLevel.setEnabled(true);
					sbsurfaceLevel.setVisible(false);
					sbAccLevel.setVisible(false);
				} else if (editPriceData[0].INFORMATION.includes("G") === false && editPriceData[0].BUYING_GROUP_NUMBER__C !== null && editPriceData[0].BUYING_GROUP_NUMBER__C !==
					"" && editPriceData[0].BUYING_GROUP_PRICE__C ===
					"X") {
					sbBGLevel.setVisible(true);
					sbBGLevel.setEnabled(true);
					sbsurfaceLevel.setVisible(false);
					sbAccLevel.setVisible(false);
				} else if (editPriceData[0].INFORMATION.includes("G") === true && (editPriceData[0].BUYING_GROUP_NUMBER__C === null ||
						editPriceData[0].BUYING_GROUP_NUMBER__C === "") &&
					editPriceData[0].PRICE_GRID_UNIQUE_KEY__C ===
					null) {
					sbBGLevel.setVisible(false);
					sbsurfaceLevel.setVisible(false);
					sbsurfaceLevel.setEnabled(false);
					sbAccLevel.setVisible(true);
				} else if (editPriceData[0].INFORMATION.includes("G") === false && (editPriceData[0].BUYING_GROUP_NUMBER__C === null || editPriceData[0].BUYING_GROUP_NUMBER__C ===
						"") && editPriceData[0].PRICE_GRID_UNIQUE_KEY__C ===
					null) {
					sbBGLevel.setVisible(false);
					sbsurfaceLevel.setVisible(false);
					sbsurfaceLevel.setEnabled(false);
					sbAccLevel.setVisible(true);
					sbAccLevel.setEnabled(false);
				} else if (editPriceData[0].INFORMATION.includes("G") === true && (editPriceData[0].BUYING_GROUP_NUMBER__C === null ||
						editPriceData[0].BUYING_GROUP_NUMBER__C === "") &&
					editPriceData[0].PRICE_GRID_UNIQUE_KEY__C !==
					null) {
					sbBGLevel.setVisible(false);
					sbsurfaceLevel.setVisible(false);
					sbsurfaceLevel.setEnabled(false);
					sbAccLevel.setVisible(true);
					sbAccLevel.setEnabled(true);
				} else if (editPriceData[0].INFORMATION.includes("G") === false && (editPriceData[0].BUYING_GROUP_NUMBER__C === null || editPriceData[0].BUYING_GROUP_NUMBER__C ===
						"") && editPriceData[0].PRICE_GRID_UNIQUE_KEY__C !==
					null) {
					sbBGLevel.setVisible(false);
					sbsurfaceLevel.setVisible(false);
					sbsurfaceLevel.setEnabled(false);
					sbAccLevel.setVisible(true);
					sbAccLevel.setEnabled(true);
				}

			}

			that.txtRoll = sap.ui.getCore().byId("txtRoll");
			that.txtCut = sap.ui.getCore().byId("txtCut");

			that.txtCarton = sap.ui.getCore().byId("txtCarton");
			that.txtEach = sap.ui.getCore().byId("txtEach");
		},

		OnCancelPGSurface: function () {
			this._oDialogPGsurface.close();
			this.fetchProducts();
		},

		afterClosePGSurface: function () {
			if (this._oDialogPGsurface) {
				this._oDialogPGsurface.destroy();
				this._oDialogPGsurface = null;
			}
		},

		OnNext: function (oEvent) {
			var that = this;
			var editPriceData = this.getView().getModel("editModel").getData();
			var txtRoll = sap.ui.getCore().byId("txtRoll");
			var txtCut = sap.ui.getCore().byId("txtCut");
			var txtCarton = sap.ui.getCore().byId("txtCarton");
			var txtEach = sap.ui.getCore().byId("txtEach");
			that.txtRoll1 = txtRoll.getValue();
			that.txtCut1 = txtCut.getValue();
			that.txtCarton11 = txtCarton.getValue();
			that.txtEach11 = txtEach.getValue();

			//Start of changes by <JAYANT PRAKASH> for <4010/4007> on <12.30.2020>
			//if (that.txtRoll1 === 0) { 
			if (that.txtRoll1 < 1) { //End of changes by <JAYANT PRAKASH> for <4010/4007> on <12.30.2020>
				txtRoll.setValueState("Error");
				MessageToast.show("Price should be greater than $1 !");
				return
			}
			//Start of changes by <JAYANT PRAKASH> for <4010/4007> on <12.30.2020>
			//else if (that.txtCut1 === 0) {
			else if (that.txtCut1 < 1) { //End of changes by <JAYANT PRAKASH> for <4010/4007> on <12.30.2020>
				txtCut.setValueState("Error");
				MessageToast.show("Price should be greater than $1 !");
				return
			}
			//Start of changes by <JAYANT PRAKASH> for <4010/4007> on <12.30.2020>
			//else if (that.txtCarton11 === 0) {
			else if (that.txtCarton11 < 0.05) { //End of changes by <JAYANT PRAKASH> for <4010/4007> on <12.30.2020>
				txtCarton.setValueState("Error");
				MessageToast.show("Price should be greater than 5 cents !");
				return
			}
			//Start of changes by <JAYANT PRAKASH> for <4010/4007> on <12.30.2020>
			//else if (that.txtEach11 === 0) {
			else if (that.txtEach11 < 0.05) { //End of changes by <JAYANT PRAKASH> for <4010/4007> on <12.30.2020>	
				txtEach.setValueState("Error");
				MessageToast.show("Price should be greater than 5 cents !");
				return

			} else {
				editPriceData[0].BILLING_PRICE_ROLL__C = typeof (editPriceData[0].BILLING_PRICE_ROLL__C) === "string" ? editPriceData[0].BILLING_PRICE_ROLL__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[0].BILLING_PRICE_ROLL__C.split("$ ")[1]) : parseFloat(editPriceData[0].BILLING_PRICE_ROLL__C) :
					editPriceData[0].BILLING_PRICE_ROLL__C;

				editPriceData[0].BILLING_PRICE_CUT__C = typeof (editPriceData[0].BILLING_PRICE_CUT__C) === "string" ? editPriceData[0].BILLING_PRICE_CUT__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[0].BILLING_PRICE_CUT__C.split("$ ")[1]) : parseFloat(editPriceData[0].BILLING_PRICE_CUT__C) :
					editPriceData[0].BILLING_PRICE_CUT__C;
				editPriceData[0].BILLING_PRICE__C = typeof (editPriceData[0].BILLING_PRICE__C) === "string" ? editPriceData[0].BILLING_PRICE__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[0].BILLING_PRICE__C.split("$ ")[1]) : parseFloat(editPriceData[0].BILLING_PRICE__C) :
					editPriceData[0].BILLING_PRICE__C;
				if (this.selectedCat === "Residential Broadloom" || this.selectedCat === "Commercial Broadloom" || this.selectedCat ===
					"Resilient Sheet") {
					if (that.txtRoll1 === editPriceData[0].BILLING_PRICE_ROLL__C || that.txtCut1 === editPriceData[0].BILLING_PRICE_CUT__C) {
						MessageBox.alert("Price is not changed !");
						return;
					}
				} else if (that.selectedCat === "Carpet Tile" || that.selectedCat === "Tile" || that.selectedCat === "TecWood" || that.selectedCat ===
					"SolidWood" || that.selectedCat === "RevWood" || that.selectedCat === "Resilient Tile") {

					if (that.txtCarton11 === editPriceData[0].BILLING_PRICE__C) {
						MessageBox.alert("Price is not changed !");
						return;
					}
				} else if (that.selectedCat === "Accessories") {
					if (that.txtEach11 === editPriceData[0].BILLING_PRICE__C) {
						MessageBox.alert("Price is not changed !");
						return;
					}
				}
				this._oDialogPGsurface.close();
				that.afterClosePGSurface();

				if (!this._oDialogJustification) {
					this._oDialogJustification = sap.ui.xmlfragment("cf.cpl.fragments.Justification", this);
					this.getView().addDependent(this._oDialogJustification);
				}

				this._oDialogJustification.open();
				var rdbReason = sap.ui.getCore().byId("rdbReason");

				rdbReason.setSelectedButton(false);

			}

		},

		OnCancelJustification: function (oEvent) {
			this._oDialogJustification.close();
		},

		afterCloseJustifcation: function () {
			if (this._oDialogJustification) {
				this._oDialogJustification.destroy();
				this._oDialogJustification = null;
			}
		},

		onBackJustification: function (oEvent) {
			var that = this;
			this._oDialogJustification.close();
			that.afterCloseJustifcation();
			that.openDialogPgSurface(this.editData);
		},

		onSelectionReason: function (oEvent) {
			var rdbReason = sap.ui.getCore().byId("rdbReason");
			var lblreasonerrmsg = sap.ui.getCore().byId("lblreasonerrmsg");
			var lblPromocodeMsg = sap.ui.getCore().byId("lblPromocodeMsg");
			rdbReason.setValueState("None");
			lblreasonerrmsg.setVisible(false);
			var txtPromocode = sap.ui.getCore().byId("txtPromocode");
			if (oEvent.getSource().getSelectedButton().getText() === "Promo Code") {
				txtPromocode.setVisible(true);
			} else {
				txtPromocode.setVisible(false);
				lblPromocodeMsg.setVisible(false);
			}
		},

		_handleValueHelpPromocode: function (oEvent) {

			var sInputPromocode = oEvent.getSource().getValue();

			this.inputPromocodeId = oEvent.getSource().getId();
			var that = this;
			var promoModel = new JSONModel();
			// create value help dialog
			if (!this._valueHelpDialogPromocode) {
				this._valueHelpDialogPromocode = sap.ui.xmlfragment(
					"cf.cpl.fragments.Promocode",
					this
				);
				this.getView().addDependent(this._valueHelpDialogPromocode);
			}

			sap.ui.getCore().busyIndicator.open();
			$.ajax({
				url: "pricing/PriceGrid.xsodata/PromoCode?$format=json",
				contentType: "application/json",
				type: 'GET',
				dataType: "json",
				async: false,
				success: function (response) {
					var promoData = response.d.results
					promoModel.setData(promoData);
					that.getView().setModel(promoModel, "promoModel");
					that._valueHelpDialogPromocode.setModel(promoModel, "promoModel");
					that._valueHelpDialogPromocode.open(sInputPromocode);
					sap.ui.getCore().busyIndicator.close();
				},
				error: function (error) {
					sap.ui.getCore().busyIndicator.close();
				}
			});

		},

		_handleValueHelpSearchPromocode: function (evt) {
			var sValuePromocode = evt.getParameter("value");
			var oFilter = new sap.ui.model.Filter(
				"PROMO_CODE__C",
				sap.ui.model.FilterOperator.Contains, sValuePromocode
			);
			evt.getSource().getBinding("items").filter([oFilter]);
		},

		_handleValueHelpConfirmPromocode: function (oEvent) {
			var oSelectedItem = oEvent.getParameter("selectedItem");

			if (oSelectedItem) {
				var PromocodeInput = sap.ui.getCore().byId("txtPromocode");
				PromocodeInput.setValue(oSelectedItem.getTitle());

			}
			oEvent.getSource().getBinding("items").filter([]);
			var lblPromocodeMsg = sap.ui.getCore().byId("lblPromocodeMsg");
			var txtPromocode = sap.ui.getCore().byId("txtPromocode");
			txtPromocode.setValueState("None");
			lblPromocodeMsg.setVisible(false);
		},

		onSurfaceBtnChange: function (oEvent) {
			var clickedBtn = oEvent.getParameters().item.getKey();
			var editPriceData = this.getView().getModel("editModel").getData();
			if (this.selectedCat === "Residential Broadloom" || this.selectedCat === "Commercial Broadloom" || this.selectedCat ===
				"Resilient Sheet") {
				if (clickedBtn === "TM1") {
					if (editPriceData[0].TM1_ROLL_PRICE__C === null || editPriceData[0].TM1_ROLL_PRICE__C === "") {
						editPriceData[0].EditRollPrice = "1";
					} else {
						editPriceData[0].EditRollPrice = editPriceData[0].TM1_ROLL_PRICE__C;
					}
					if (editPriceData[0].TM1_CUT_PRICE__C === null || editPriceData[0].TM1_CUT_PRICE__C === "") {

						editPriceData[0].EditCutPrice = "1";
					} else {

						editPriceData[0].EditCutPrice = editPriceData[0].TM1_CUT_PRICE__C;
					}

				} else if (clickedBtn === "TM2") {
					if (editPriceData[0].TM2_ROLL_PRICE__C === null || editPriceData[0].TM2_ROLL_PRICE__C === "") {
						editPriceData[0].EditRollPrice = "1";
					} else {
						editPriceData[0].EditRollPrice = editPriceData[0].TM2_ROLL_PRICE__C;
					}

					if (editPriceData[0].TM2_CUT_PRICE__C === null || editPriceData[0].TM2_CUT_PRICE__C === "") {

						editPriceData[0].EditCutPrice = "1";
					} else {

						editPriceData[0].EditCutPrice = editPriceData[0].TM2_CUT_PRICE__C;
					}

				} else if (clickedBtn === "TM3") {
					if (editPriceData[0].TM3_ROLL_PRICE__C === null || editPriceData[0].TM3_ROLL_PRICE__C === "") {
						editPriceData[0].EditRollPrice = "1";
					} else {
						editPriceData[0].EditRollPrice = editPriceData[0].TM3_ROLL_PRICE__C;
					}

					if (editPriceData[0].TM3_CUT_PRICE__C === null || editPriceData[0].TM3_CUT_PRICE__C === "") {

						editPriceData[0].EditCutPrice = "1";
					} else {

						editPriceData[0].EditCutPrice = editPriceData[0].TM3_CUT_PRICE__C;
					}

				} else if (clickedBtn === "DM") {
					if (editPriceData[0].DM_ROLL_PRICE__C === null || editPriceData[0].DM_ROLL_PRICE__C === "") {
						editPriceData[0].EditRollPrice = "1";
					} else {
						editPriceData[0].EditRollPrice = editPriceData[0].DM_ROLL_PRICE__C;
					}

					if (editPriceData[0].DM_CUT_PRICE__C === null || editPriceData[0].DM_CUT_PRICE__C === "") {

						editPriceData[0].EditCutPrice = "1";
					} else {

						editPriceData[0].EditCutPrice = editPriceData[0].DM_CUT_PRICE__C;
					}

				} else if (clickedBtn === "RVP") {
					if (editPriceData[0].RVP_ROLL_PRICE__C === null || editPriceData[0].RVP_ROLL_PRICE__C === "") {
						editPriceData[0].EditRollPrice = "1";
					} else {
						editPriceData[0].EditRollPrice = editPriceData[0].RVP_ROLL_PRICE__C;
					}

					if (editPriceData[0].RVP_CUT_PRICE__C === null || editPriceData[0].RVP_CUT_PRICE__C === "") {

						editPriceData[0].EditCutPrice = "1";
					} else {

						editPriceData[0].EditCutPrice = editPriceData[0].RVP_CUT_PRICE__C;
					}
				}
			} else if (this.selectedCat === "Carpet Tile" || this.selectedCat === "Tile" || this.selectedCat === "TecWood" || this.selectedCat ===
				"SolidWood" || this.selectedCat === "RevWood" || this.selectedCat === "Resilient Tile") {
				if (clickedBtn === "TM1") {
					if (editPriceData[0].TM_PRICE__C === null || editPriceData[0].TM_PRICE__C === "") {
						editPriceData[0].EditCartonPrice = "0.05";
					} else {
						editPriceData[0].EditCartonPrice = editPriceData[0].TM_PRICE__C;
					}
				} else if (clickedBtn === "TM2") {
					if (editPriceData[0].TM2_PRICE__C === null || editPriceData[0].TM2_PRICE__C === "") {
						editPriceData[0].EditCartonPrice = "0.05";
					} else {
						editPriceData[0].EditCartonPrice = editPriceData[0].TM2_PRICE__C;
					}
				} else if (clickedBtn === "TM3") {
					if (editPriceData[0].TM3_PRICE__C === null || editPriceData[0].TM3_PRICE__C === "") {
						editPriceData[0].EditCartonPrice = "0.05";
					} else {
						editPriceData[0].EditCartonPrice = editPriceData[0].TM3_PRICE__C;
					}
				} else if (clickedBtn === "DM") {
					if (editPriceData[0].DM_PRICE__C === null || editPriceData[0].DM_PRICE__C === "") {
						editPriceData[0].EditCartonPrice = "0.05";
					} else {
						editPriceData[0].EditCartonPrice = editPriceData[0].DM_PRICE__C;
					}
				} else if (clickedBtn === "RVP") {
					if (editPriceData[0].RVP_PRICE__C === null || editPriceData[0].RVP_PRICE__C === "") {
						editPriceData[0].EditCartonPrice = "0.05";
					} else {
						editPriceData[0].EditCartonPrice = editPriceData[0].RVP_PRICE__C;
					}
				}
			}
			this.getView().getModel("editModel").setData(editPriceData);
		},

		onAccesBtnChange: function (oEvent) {
			var clickedBtn = oEvent.getParameters().item.getKey();
			var editPriceData = this.getView().getModel("editModel").getData();
		/*	if (clickedBtn === "TM") {
				if (editPriceData[0].TM_PRICE__C === null || editPriceData[0].TM_PRICE__C === "") {
					editPriceData[0].EditEachPrice = "0.05";

				} else {
					editPriceData[0].EditEachPrice = editPriceData[0].TM_PRICE__C;
				}
			} else if (clickedBtn === "DM") {
				if (editPriceData[0].DM_PRICE__C === null || editPriceData[0].DM_PRICE__C === "") {
					editPriceData[0].EditEachPrice = "0.05";

				} else {
					editPriceData[0].EditEachPrice = editPriceData[0].DM_PRICE__C;
				}
			} else if (clickedBtn === "RVP") {
				if (editPriceData[0].RVP_PRICE__C === null || editPriceData[0].RVP_PRICE__C === "") {
					editPriceData[0].EditEachPrice = "0.05";

				} else {
					editPriceData[0].EditEachPrice = editPriceData[0].RVP_PRICE__C;
				}
			}*/
			//Changes by diksha to set level of ACCESSORIES To TM1,TM2,TM3,DM,RVP  --1/1/2020
				if (clickedBtn === "TM1") {
					if (editPriceData[0].TM_PRICE__C === null || editPriceData[0].TM_PRICE__C === "") {
						editPriceData[0].EditEachPrice = "0.05";
					} else {
						editPriceData[0].EditEachPrice = editPriceData[0].TM_PRICE__C;
					}
				} else if (clickedBtn === "TM2") {
					if (editPriceData[0].TM2_PRICE__C === null || editPriceData[0].TM2_PRICE__C === "") {
						editPriceData[0].EditEachPrice = "0.05";
					} else {
						editPriceData[0].EditEachPrice = editPriceData[0].TM2_PRICE__C;
					}
				} else if (clickedBtn === "TM3") {
					if (editPriceData[0].TM3_PRICE__C === null || editPriceData[0].TM3_PRICE__C === "") {
						editPriceData[0].EditEachPrice = "0.05";
					} else {
						editPriceData[0].EditEachPrice = editPriceData[0].TM3_PRICE__C;
					}
				} else if (clickedBtn === "DM") {
					if (editPriceData[0].DM_PRICE__C === null || editPriceData[0].DM_PRICE__C === "") {
						editPriceData[0].EditEachPrice = "0.05";
					} else {
						editPriceData[0].EditEachPrice = editPriceData[0].DM_PRICE__C;
					}
				} else if (clickedBtn === "RVP") {
					if (editPriceData[0].RVP_PRICE__C === null || editPriceData[0].RVP_PRICE__C === "") {
						editPriceData[0].EditEachPrice = "0.05";
					} else {
						editPriceData[0].EditEachPrice = editPriceData[0].RVP_PRICE__C;
					}
				}
			this.getView().getModel("editModel").setData(editPriceData);
		},

		onBGBtnChange: function (oEvent) {
			var clickedBtn = oEvent.getParameters().item.getKey();
			var editPriceData = this.getView().getModel("editModel").getData();
			if (clickedBtn === "BG") {
				if (this.selectedCat === "Residential Broadloom" || this.selectedCat === "Commercial Broadloom" || this.selectedCat ===
					"Resilient Sheet") {
					if (editPriceData[0].GROUP_ROLL_PRICE__C === null || editPriceData[0].GROUP_ROLL_PRICE__C === "") {
						editPriceData[0].EditRollPrice = "1";
					} else {
						editPriceData[0].EditRollPrice = editPriceData[0].GROUP_ROLL_PRICE__C;
					}

					if (editPriceData[0].GROUP_CUT_PRICE__C === null || editPriceData[0].GROUP_CUT_PRICE__C === "") {

						editPriceData[0].EditCutPrice = "1";
					} else {

						editPriceData[0].EditCutPrice = editPriceData[0].GROUP_CUT_PRICE__C;
					}

				} else if (this.selectedCat === "Carpet Tile" || this.selectedCat === "Tile" || this.selectedCat === "TecWood" || this.selectedCat ===
					"SolidWood" || this.selectedCat === "RevWood" || this.selectedCat === "Resilient Tile") {
					if (editPriceData[0].GROUP_PRICE_CARTON__C === null || editPriceData[0].GROUP_PRICE_CARTON__C === "") {
						editPriceData[0].EditCartonPrice = "0.05";

					} else {
						editPriceData[0].EditCartonPrice = editPriceData[0].GROUP_PRICE_CARTON__C;

					}
				} else if (this.selectedCat === "Accessories") {
					if (editPriceData[0].GROUP_PRICE_CARTON__C === null || editPriceData[0].GROUP_PRICE_CARTON__C === "") {
						editPriceData[0].EditCartonPrice = "0.05";

					} else {
						editPriceData[0].EditEachPrice = editPriceData[0].GROUP_PRICE__C;

					}
				}
			}
			this.getView().getModel("editModel").setData(editPriceData);
		},

		onSavePrice: function () {
			var that = this;
			var oModelPromo = that.getView().getModel("promoModel");
			var editPriceData = this.getView().getModel("editModel").getData();
			var txtRoll1 = sap.ui.getCore().byId("idtxtRoll1").setText(that.txtRoll);
			var txtCut1 = sap.ui.getCore().byId("idtxtCut1").setText(that.txtCut);

			var txtCarton11 = sap.ui.getCore().byId("idtxtCarton1").setText(that.txtCarton);
			var txtEach11 = sap.ui.getCore().byId("idtxtEach1").setText(that.txtEach);
			var txtPromocode = sap.ui.getCore().byId("txtPromocode");
			var lblPromocodeMsg = sap.ui.getCore().byId("lblPromocodeMsg");
			var txtComment = sap.ui.getCore().byId("txtComment");
			var lblcommenterrmsg = sap.ui.getCore().byId("lblcommenterrmsg");
			var rdbReason = sap.ui.getCore().byId("rdbReason");
			var lblreasonerrmsg = sap.ui.getCore().byId("lblreasonerrmsg");

			if (rdbReason.getSelectedButton() === undefined) {
				lblreasonerrmsg.setVisible(true);
				rdbReason.setValueState("Error");

			} else {
				lblreasonerrmsg.setVisible(false);
				if (rdbReason.getSelectedButton().getText() === "Promo Code" && txtPromocode.getValue() === "") {
					txtPromocode.setValueState("Error");
					lblPromocodeMsg.setVisible(true);
					return;
				} else {
					txtPromocode.setValueState("None");
					lblPromocodeMsg.setVisible(false);
				}
			}

			var PromocodeFlag = false;
			if (txtPromocode.getValue() !== "") {
				for (var m = 0; m < oModelPromo.getData().length; m++) {
					if (txtPromocode.getValue() === oModelPromo.getData()[m].PROMO_CODE__C) {
						PromocodeFlag = true;
						break;
					}

				}
				if (PromocodeFlag === false) {
					txtPromocode.setValueState("Error");
					lblPromocodeMsg.setVisible(true);
					return;
				}
			}

			editPriceData[0].BILLING_PRICE_ROLL__C = typeof (editPriceData[0].BILLING_PRICE_ROLL__C) === "string" ? editPriceData[0].BILLING_PRICE_ROLL__C
				.split("$ ").length > 0 ? parseFloat(editPriceData[0].BILLING_PRICE_ROLL__C.split("$ ")[1]) : parseFloat(editPriceData[0].BILLING_PRICE_ROLL__C) :
				editPriceData[0].BILLING_PRICE_ROLL__C;

			editPriceData[0].BILLING_PRICE_CUT__C = typeof (editPriceData[0].BILLING_PRICE_CUT__C) === "string" ? editPriceData[0].BILLING_PRICE_CUT__C
				.split("$ ").length > 0 ? parseFloat(editPriceData[0].BILLING_PRICE_CUT__C.split("$ ")[1]) : parseFloat(editPriceData[0].BILLING_PRICE_CUT__C) :
				editPriceData[0].BILLING_PRICE_CUT__C;
			editPriceData[0].BILLING_PRICE__C = typeof (editPriceData[0].BILLING_PRICE__C) === "string" ? editPriceData[0].BILLING_PRICE__C
				.split("$ ").length > 0 ? parseFloat(editPriceData[0].BILLING_PRICE__C.split("$ ")[1]) : parseFloat(editPriceData[0].BILLING_PRICE__C) :
				editPriceData[0].BILLING_PRICE__C;

			editPriceData[0].DM_ROLL_PRICE__C = parseFloat(editPriceData[0].DM_ROLL_PRICE__C, 10);
			editPriceData[0].DM_CUT_PRICE__C = parseFloat(editPriceData[0].DM_CUT_PRICE__C, 10);
			editPriceData[0].DM_PRICE__C = parseFloat(editPriceData[0].DM_PRICE__C, 10);
			editPriceData[0].RVP_ROLL_PRICE__C = parseFloat(editPriceData[0].RVP_ROLL_PRICE__C, 10);
			editPriceData[0].RVP_CUT_PRICE__C = parseFloat(editPriceData[0].RVP_CUT_PRICE__C, 10);
			editPriceData[0].RVP_PRICE__C = parseFloat(editPriceData[0].RVP_PRICE__C, 10);

			editPriceData[0].EditCartonPrice = typeof (editPriceData[0].BILLING_PRICE__C) === "string" ? editPriceData[0].BILLING_PRICE__C
				.split("$ ").length > 0 ? parseFloat(editPriceData[0].BILLING_PRICE__C.split("$ ")[1]) : parseFloat(editPriceData[0].BILLING_PRICE__C) :
				editPriceData[0].BILLING_PRICE__C;

			editPriceData[0].EditEachPrice = typeof (editPriceData[0].BILLING_PRICE__C) === "string" ? editPriceData[0].BILLING_PRICE__C
				.split("$ ").length > 0 ? parseFloat(editPriceData[0].BILLING_PRICE__C.split("$ ")[1]) : parseFloat(editPriceData[0].BILLING_PRICE__C) :
				editPriceData[0].BILLING_PRICE__C;

			editPriceData[0].EditRollPrice = parseFloat(editPriceData[0].BILLING_PRICE_ROLL__C, 10);
			editPriceData[0].EditCutPrice = parseFloat(editPriceData[0].BILLING_PRICE_CUT__C, 10);

			if (txtComment.getValue() === "" || txtComment.getValue() === null || rdbReason.getSelectedButton() === undefined) {

				if (that.userRole === "TM") {
					if (that.selectedCat === "Residential Broadloom" || that.selectedCat === "Commercial Broadloom" || that.selectedCat ===
						"Resilient Sheet") {
						if ((that.txtRoll1 > editPriceData[0].DM_ROLL_PRICE__C) && (that.txtCut1 >
								editPriceData[0].DM_CUT_PRICE__C)) {
							lblcommenterrmsg.setVisible(false);
							txtComment.setValueState("None");
							rdbReason.setValueState("None");
							lblreasonerrmsg.setVisible(false);
						} else if ((that.txtRoll1 <= editPriceData[0].DM_ROLL_PRICE__C) || (that.txtCut1 <=
								editPriceData[0].DM_CUT_PRICE__C)) {
							lblcommenterrmsg.setVisible(true);
							txtComment.setValueState("Error");
							if (txtComment.getValue() === "") {
								lblcommenterrmsg.setVisible(true);
								txtComment.setValueState("Error");
							} else {
								lblcommenterrmsg.setVisible(false);
								txtComment.setValueState("None");
							}
							return;
						}
					} else if (that.selectedCat === "Carpet Tile" || that.selectedCat === "Tile" || that.selectedCat === "TecWood" || that.selectedCat ===
						"SolidWood" || that.selectedCat === "RevWood" || that.selectedCat === "Resilient Tile") {
						if (that.txtCarton11 > editPriceData[0].DM_PRICE__C) {
							lblcommenterrmsg.setVisible(false);
							txtComment.setValueState("None");
							rdbReason.setValueState("None");
							lblreasonerrmsg.setVisible(false);

						} else if (that.txtCarton11 <= editPriceData[0].DM_PRICE__C) {
							lblcommenterrmsg.setVisible(true);
							txtComment.setValueState("Error");
							if (txtComment.getValue() === "") {
								lblcommenterrmsg.setVisible(true);
								txtComment.setValueState("Error");
							} else {
								lblcommenterrmsg.setVisible(false);
								txtComment.setValueState("None");
							}
							return;
						}
					} else if (that.selectedCat === "Accessories") {
						if (that.txtEach11 > editPriceData[0].DM_PRICE__C) {
							lblcommenterrmsg.setVisible(false);
							txtComment.setValueState("None");
							rdbReason.setValueState("None");
							lblreasonerrmsg.setVisible(false);
						} else if (that.txtEach11 <= editPriceData[0].DM_PRICE__C) {
							lblcommenterrmsg.setVisible(true);
							txtComment.setValueState("Error");
							if (txtComment.getValue() === "") {
								lblcommenterrmsg.setVisible(true);
								txtComment.setValueState("Error");
							} else {
								lblcommenterrmsg.setVisible(false);
								txtComment.setValueState("None");
							}
							return;
						}
					}

				} else if (that.userRole === "DM") {
					if (that.selectedCat === "Residential Broadloom" || that.selectedCat === "Commercial Broadloom" || that.selectedCat ===
						"Resilient Sheet") {
						if ((that.txtRoll1 >= editPriceData[0].DM_ROLL_PRICE__C) && (that.txtCut1 >=
								editPriceData[0].DM_CUT_PRICE__C)) {
							lblcommenterrmsg.setVisible(false);
							txtComment.setValueState("None");
							rdbReason.setValueState("None");
							lblreasonerrmsg.setVisible(false);
						} else if ((that.txtRoll1 < editPriceData[0].DM_ROLL_PRICE__C) || (that.txtCut1 <
								editPriceData[0].DM_CUT_PRICE__C)) {
							lblcommenterrmsg.setVisible(true);
							txtComment.setValueState("Error");
							if (txtComment.getValue() === "") {
								lblcommenterrmsg.setVisible(true);
								txtComment.setValueState("Error");
							} else {
								lblcommenterrmsg.setVisible(false);
								txtComment.setValueState("None");
							}
							return;
						}
					} else if (that.selectedCat === "Carpet Tile" || that.selectedCat === "Tile" || that.selectedCat === "TecWood" || that.selectedCat ===
						"SolidWood" || that.selectedCat === "RevWood" || that.selectedCat === "Resilient Tile") {
						if (that.txtCarton11 >= editPriceData[0].DM_PRICE__C) {
							lblcommenterrmsg.setVisible(false);
							txtComment.setValueState("None");
							rdbReason.setValueState("None");
							lblreasonerrmsg.setVisible(false);
						} else if (that.txtCarton11 < editPriceData[0].DM_PRICE__C) {
							lblcommenterrmsg.setVisible(true);
							txtComment.setValueState("Error");
							if (txtComment.getValue() === "") {
								lblcommenterrmsg.setVisible(true);
								txtComment.setValueState("Error");
							} else {
								lblcommenterrmsg.setVisible(false);
								txtComment.setValueState("None");
							}
							return;
						}
					} else if (that.selectedCat === "Accessories") {
						if (that.txtEach11 >= editPriceData[0].DM_PRICE__C) {
							lblcommenterrmsg.setVisible(false);
							txtComment.setValueState("None");
							rdbReason.setValueState("None");
							lblreasonerrmsg.setVisible(false);
						} else if (that.txtEach11 < editPriceData[0].DM_PRICE__C) {
							lblcommenterrmsg.setVisible(true);
							txtComment.setValueState("Error");
							if (txtComment.getValue() === "") {
								lblcommenterrmsg.setVisible(true);
								txtComment.setValueState("Error");
							} else {
								lblcommenterrmsg.setVisible(false);
								txtComment.setValueState("None");
							}
							return;
						}
					}

				} else if (that.userRole === "RVP") {
					if (that.selectedCat === "Residential Broadloom" || that.selectedCat === "Commercial Broadloom" || that.selectedCat ===
						"Resilient Sheet") {
						if ((that.txtRoll1 >= editPriceData[0].RVP_ROLL_PRICE__C) && (that.txtCut1 >=
								editPriceData[0].RVP_CUT_PRICE__C)) {
							lblcommenterrmsg.setVisible(false);
							txtComment.setValueState("None");
							rdbReason.setValueState("None");
							lblreasonerrmsg.setVisible(false);
						} else if ((that.txtRoll1 < editPriceData[0].RVP_ROLL_PRICE__C) || (that.txtCut1 <
								editPriceData[0].RVP_CUT_PRICE__C)) {
							lblcommenterrmsg.setVisible(true);
							txtComment.setValueState("Error");
							if (txtComment.getValue() === "") {
								lblcommenterrmsg.setVisible(true);
								txtComment.setValueState("Error");
							} else {
								lblcommenterrmsg.setVisible(false);
								txtComment.setValueState("None");
							}
							return;
						}
					} else if (that.selectedCat === "Carpet Tile" || that.selectedCat === "Tile" || that.selectedCat === "TecWood" || that.selectedCat ===
						"SolidWood" || that.selectedCat === "RevWood" || that.selectedCat === "Resilient Tile") {
						if (that.txtCarton11 >= editPriceData[0].RVP_PRICE__C) {
							lblcommenterrmsg.setVisible(false);
							txtComment.setValueState("None");
							rdbReason.setValueState("None");
							lblreasonerrmsg.setVisible(false);
						} else if (that.txtCarton11 < editPriceData[0].RVP_PRICE__C) {
							lblcommenterrmsg.setVisible(true);
							txtComment.setValueState("Error");
							if (txtComment.getValue() === "") {
								lblcommenterrmsg.setVisible(true);
								txtComment.setValueState("Error");
							} else {
								lblcommenterrmsg.setVisible(false);
								txtComment.setValueState("None");
							}
							return;
						}
					} else if (that.selectedCat === "Accessories") {
						if (that.txtEach11 >= editPriceData[0].RVP_PRICE__C) {
							lblcommenterrmsg.setVisible(false);
							txtComment.setValueState("None");
							rdbReason.setValueState("None");
							lblreasonerrmsg.setVisible(false);
						} else if (that.txtEach11 < editPriceData[0].RVP_PRICE__C) {
							lblcommenterrmsg.setVisible(true);
							txtComment.setValueState("Error");
							if (txtComment.getValue() === "") {
								lblcommenterrmsg.setVisible(true);
								txtComment.setValueState("Error");
							} else {
								lblcommenterrmsg.setVisible(false);
								txtComment.setValueState("None");
							}
							return;
						}
					}

				}
			}
			var editPriceData = this.getView().getModel("editModel").getData()[0];

			var updateUrl = "";
			var payload = ""
			var reqNetPriceCut = "";
			var reqNetPriceRoll = "";
			var reqNetPriceAcc = "";
			var justification = "";
			var reqNetPriceCarton = "";

			if (rdbReason.getSelectedButton() !== undefined) {
				switch (rdbReason.getSelectedButton().getText()) {
				case "Promotional Price":
					justification = "1";
					break;
				case "Stocking Price":
					justification = "2";
					break;
				case "Competitor Price Match":
					justification = "3";
					break;
				case "Promo Code":
					justification = "4";
					break;
				case "Other":
					justification = "5";
					break;
				default:
					justification = "";
					break;
				}
			}

			//changes for Sorting by Blue color 
			if (editPriceData.EditCutPrice === null || editPriceData.EditCutPrice === undefined) {
				editPriceData.EditCutPrice = 0;

			} else {
				editPriceData.EditCutPrice = editPriceData.EditCutPrice;
			}
			if (editPriceData.CORPORATE_CUT_PALLET_DOLLAR__C === null || editPriceData.CORPORATE_CUT_PALLET_DOLLAR__C === undefined) {
				editPriceData.CORPORATE_CUT_PALLET_DOLLAR__C = 0;

			} else {
				editPriceData.CORPORATE_CUT_PALLET_DOLLAR__C = editPriceData.CORPORATE_CUT_PALLET_DOLLAR__C;
			}
			if (editPriceData.CORPORATE_CUT_PALLET_PERCENT__C === null || editPriceData.CORPORATE_CUT_PALLET_PERCENT__C === undefined) {
				editPriceData.CORPORATE_CUT_PALLET_PERCENT__C = 0;

			} else {
				editPriceData.CORPORATE_CUT_PALLET_PERCENT__C = editPriceData.CORPORATE_CUT_PALLET_PERCENT__C;
			}

			if (editPriceData.EditRollPrice === null || editPriceData.EditRollPrice === undefined) {
				editPriceData.EditRollPrice = 0;

			} else {
				editPriceData.EditRollPrice = editPriceData.EditRollPrice;
			}
			if (editPriceData.CORPORATE_ROLL_CARTON_DOLLAR__C === null || editPriceData.CORPORATE_ROLL_CARTON_DOLLAR__C === undefined) {
				editPriceData.CORPORATE_ROLL_CARTON_DOLLAR__C = 0;

			} else {
				editPriceData.CORPORATE_ROLL_CARTON_DOLLAR__C = editPriceData.CORPORATE_ROLL_CARTON_DOLLAR__C;
			}
			if (editPriceData.CORPORATE_ROLL_CARTON_PERCENT__C === null || editPriceData.CORPORATE_ROLL_CARTON_PERCENT__C === undefined) {
				editPriceData.CORPORATE_ROLL_CARTON_PERCENT__C = 0;

			} else {
				editPriceData.CORPORATE_ROLL_CARTON_PERCENT__C = editPriceData.CORPORATE_ROLL_CARTON_PERCENT__C;
			}

			if (editPriceData.NON_CORPORATE_CUT_PALLET_DOLLAR__C === null || editPriceData.NON_CORPORATE_CUT_PALLET_DOLLAR__C === undefined) {
				editPriceData.NON_CORPORATE_CUT_PALLET_DOLLAR__C = 0;

			} else {
				editPriceData.NON_CORPORATE_CUT_PALLET_DOLLAR__C = editPriceData.NON_CORPORATE_CUT_PALLET_DOLLAR__C;
			}
			if (editPriceData.NON_CORPORATE_CUT_PALLET_PERCENT__C === null || editPriceData.NON_CORPORATE_CUT_PALLET_PERCENT__C === undefined) {
				editPriceData.NON_CORPORATE_CUT_PALLET_PERCENT__C = 0;

			} else {
				editPriceData.NON_CORPORATE_CUT_PALLET_PERCENT__C = editPriceData.NON_CORPORATE_CUT_PALLET_PERCENT__C;
			}
			if (editPriceData.NON_CORPORATE_ROLL_CARTON_DOLLAR__C === null || editPriceData.NON_CORPORATE_ROLL_CARTON_DOLLAR__C === undefined) {
				editPriceData.NON_CORPORATE_ROLL_CARTON_DOLLAR__C = 0;

			} else {
				editPriceData.NON_CORPORATE_ROLL_CARTON_DOLLAR__C = editPriceData.NON_CORPORATE_ROLL_CARTON_DOLLAR__C;
			}
			if (editPriceData.NON_CORPORATE_ROLL_CARTON_PERCENT__C === null || editPriceData.NON_CORPORATE_ROLL_CARTON_PERCENT__C === undefined) {
				editPriceData.NON_CORPORATE_ROLL_CARTON_PERCENT__C = 0;

			} else {
				editPriceData.NON_CORPORATE_ROLL_CARTON_PERCENT__C = editPriceData.NON_CORPORATE_ROLL_CARTON_PERCENT__C;
			}

			if (editPriceData.EditCartonPrice === null || editPriceData.EditCartonPrice === undefined) {
				editPriceData.EditCartonPrice = 0;

			} else {
				editPriceData.EditCartonPrice = editPriceData.EditCartonPrice;
			}
			//changes for Sorting by Blue color 

			if (editPriceData.BILLING_PRICE_ROLL__C) {
				if (editPriceData.BUYING_GROUP_NUMBER__C !== null) {
					reqNetPriceCut = parseFloat(editPriceData.EditCutPrice) - (parseFloat(editPriceData.CORPORATE_CUT_PALLET_DOLLAR__C) +
						parseFloat(editPriceData.EditCutPrice) * parseFloat(editPriceData.CORPORATE_CUT_PALLET_PERCENT__C) / 100);

					reqNetPriceRoll = parseFloat(editPriceData.EditRollPrice) - (parseFloat(editPriceData.CORPORATE_ROLL_CARTON_DOLLAR__C) +
						parseFloat(editPriceData.EditRollPrice) * parseFloat(editPriceData.CORPORATE_ROLL_CARTON_PERCENT__C) / 100);

				} else {
					reqNetPriceCut = parseFloat(editPriceData.EditCutPrice) - (parseFloat(editPriceData.NON_CORPORATE_CUT_PALLET_DOLLAR__C) +
						parseFloat(editPriceData.EditCutPrice) * parseFloat(editPriceData.NON_CORPORATE_CUT_PALLET_PERCENT__C) / 100);

					reqNetPriceRoll = parseFloat(editPriceData.EditRollPrice) - (parseFloat(editPriceData.NON_CORPORATE_ROLL_CARTON_DOLLAR__C) +
						parseFloat(editPriceData.EditRollPrice) * parseFloat(editPriceData.NON_CORPORATE_ROLL_CARTON_PERCENT__C) / 100);

				}

				if (reqNetPriceCut === "") {
					reqNetPriceCut = 0;
				} else {
					reqNetPriceCut = parseFloat(reqNetPriceCut);
				}

				if (reqNetPriceRoll === "") {
					reqNetPriceRoll = 0;
				} else {
					reqNetPriceRoll = parseFloat(reqNetPriceRoll);
				}

			}

			if (editPriceData.BILLING_PRICE__C) {
				if (editPriceData.BUYING_GROUP_NUMBER__C !== null) {

					reqNetPriceAcc = parseFloat(editPriceData.EditEachPrice) - (parseFloat(editPriceData.CORPORATE_ROLL_CARTON_DOLLAR__C) +
						parseFloat(editPriceData.EditEachPrice) * parseFloat(editPriceData.CORPORATE_ROLL_CARTON_PERCENT__C) / 100);

					reqNetPriceCarton = parseFloat(editPriceData.EditCartonPrice) - (parseFloat(editPriceData.CORPORATE_ROLL_CARTON_DOLLAR__C) +
						parseFloat(editPriceData.EditCartonPrice) * parseFloat(editPriceData.CORPORATE_ROLL_CARTON_PERCENT__C) / 100);

				} else {

					reqNetPriceAcc = parseFloat(editPriceData.EditEachPrice) - (parseFloat(editPriceData.NON_CORPORATE_ROLL_CARTON_DOLLAR__C) +
						parseFloat(editPriceData.EditEachPrice) * parseFloat(editPriceData.NON_CORPORATE_ROLL_CARTON_PERCENT__C) / 100);

					reqNetPriceCarton = parseFloat(editPriceData.EditCartonPrice) - (parseFloat(editPriceData.NON_CORPORATE_ROLL_CARTON_DOLLAR__C) +
						parseFloat(editPriceData.EditCartonPrice) * parseFloat(editPriceData.NON_CORPORATE_ROLL_CARTON_PERCENT__C) / 100);
				}

				if (reqNetPriceAcc === "") {
					reqNetPriceAcc = 0;
				} else {
					reqNetPriceAcc = parseFloat(reqNetPriceAcc);
				}
				if (reqNetPriceCarton === "") {
					reqNetPriceCarton = 0;
				} else {
					reqNetPriceCarton = parseFloat(reqNetPriceCarton);
				}

			}

			var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});

			var startDate = editPriceData.EDIT_START_DATE;
			var endDate = editPriceData.EDIT_END_DATE;

			var dpkStartdate = dateFormat.format(new Date(this.dpkStartdate));
			var dpkEnddate = dateFormat.format(new Date(this.dpkEnddate));

			var cplRecordId = new Date().getTime().toString();

			var txtCut1 = txtCut1.getText();
			var txtRoll1 = txtRoll1.getText();
			var txtEach11 = txtEach11.getText();
			var txtCarton11 = txtCarton11.getText();

			that.txtCut1 = that.txtCut1 !== null ? that.txtCut1 : 0;
			that.txtRoll1 = that.txtRoll1 !== null ? that.txtRoll1 : 0;
			reqNetPriceCut = reqNetPriceCut !== null ? reqNetPriceCut : 0;
			reqNetPriceRoll = reqNetPriceRoll !== null ? reqNetPriceRoll : 0;
			that.txtCarton11 = that.txtCarton11 !== null ? that.txtCarton11 : 0;
			reqNetPriceCarton = reqNetPriceCarton !== null ? reqNetPriceCarton : 0;
			that.txtEach11 = that.txtEach11 !== null ? that.txtEach11 : 0;
			reqNetPriceAcc = reqNetPriceAcc !== null ? reqNetPriceAcc : 0;

			if (this.lmtdPrice === false) {

				if (this.selectedCat === "Residential Broadloom" || this.selectedCat === "Commercial Broadloom" || this.selectedCat ===
					"Resilient Sheet") {
					updateUrl = "pricing/Updatecplhardsurface.xsjs";
					payload = {
						"Accountno": editPriceData.ACCOUNT__C,
						"Productcategory": this.selectedCat,
						"Productuniquekey": editPriceData.PRODUCT_UNIQUE_KEY__C,
						"Whcode": this.selectedWH,
						"Cplpriceid": editPriceData.CPL_PRICE_ID__C,
						"Startdate": startDate,
						"Enddate": endDate,
						"Cplrecordid": cplRecordId,
						"Approvalstatus": "1",
						"Justification": justification,
						"Promocode": txtPromocode.getValue(),
						"Modifiedby": that.loggedInUser,
						"Reqbillpricecut": that.txtCut1,
						"Reqbillpriceroll": that.txtRoll1,
						"Reqnetpricecut": reqNetPriceCut,
						"Reqnetpriceroll": reqNetPriceRoll
					};
				} else if (this.selectedCat === "Carpet Tile" || this.selectedCat === "Tile" || this.selectedCat === "TecWood" || this.selectedCat ===
					"SolidWood" || this.selectedCat === "RevWood" || this.selectedCat === "Resilient Tile") {
					updateUrl = "pricing/Updatecplsoftsurface.xsjs";

					payload = {
						"Accountno": editPriceData.ACCOUNT__C,
						"Productcategory": this.selectedCat,
						"Productuniquekey": editPriceData.PRODUCT_UNIQUE_KEY__C,
						"Whcode": this.selectedWH,
						"Cplpriceid": editPriceData.CPL_PRICE_ID__C,
						"Startdate": startDate,
						"Enddate": endDate,
						"Cplrecordid": cplRecordId,
						"Approvalstatus": "1",
						"Justification": justification,
						"Promocode": txtPromocode.getValue(),
						"Modifiedby": that.loggedInUser,
						"Reqbillpricecarton": that.txtCarton11,
						"Reqbillpricepallet": that.txtCarton11,
						"Reqnetpricecarton": reqNetPriceCarton,
						"Reqnetpricepallet": reqNetPriceCarton
					};

				} else if (this.selectedCat === "Accessories") {
					updateUrl = "pricing/Updatecplaccessories.xsjs";
					payload = {
						"Accountno": editPriceData.ACCOUNT__C,
						"Productcategory": this.selectedCat,
						"Productuniquekey": editPriceData.PRODUCT_UNIQUE_KEY__C,
						"Whcode": this.selectedWH,
						"Cplpriceid": editPriceData.CPL_PRICE_ID__C,
						"Startdate": startDate,
						"Enddate": endDate,
						"Cplrecordid": cplRecordId,
						"Approvalstatus": "1",
						"Justification": justification,
						"Promocode": txtPromocode.getValue(),
						"Modifiedby": that.loggedInUser,
						"Reqbillprice": that.txtEach11,
						"Reqnetprice": reqNetPriceAcc
					};
				}
			} else {

				if (this.selectedCat === "Residential Broadloom") {
					updateUrl = "pricing/InsertLimitedRB.xsjs";
					payload = {
						"Accountno": editPriceData.ACCOUNT__C,
						"Productuniquekey": editPriceData.PRODUCT_UNIQUE_KEY__C,
						"Whcode": this.selectedWH,
						"Cplpriceid": editPriceData.CPL_PRICE_ID__C,
						"Startdate": startDate,
						"Enddate": endDate,
						"Newstartdate": dpkStartdate,
						"Newenddate": dpkEnddate,
						"Cplrecordid": cplRecordId,
						"Approvalstatus": "1",
						"Justification": justification,
						"Promocode": txtPromocode.getValue(),
						"Modifiedby": that.loggedInUser,
						"Reqbillpricecut": parseFloat(that.txtCut1),
						"Reqbillpriceroll": parseFloat(that.txtRoll1),
						"Reqnetpricecut": reqNetPriceCut,
						"Reqnetpriceroll": reqNetPriceRoll
					};
				} else if (this.selectedCat === "Commercial Broadloom") {
					updateUrl = "pricing/InsertLimitedCB.xsjs";
					payload = {
						"Accountno": editPriceData.ACCOUNT__C,
						"Productuniquekey": editPriceData.PRODUCT_UNIQUE_KEY__C,
						"Whcode": this.selectedWH,
						"Cplpriceid": editPriceData.CPL_PRICE_ID__C,
						"Startdate": startDate,
						"Enddate": endDate,
						"Newstartdate": dpkStartdate,
						"Newenddate": dpkEnddate,
						"Cplrecordid": cplRecordId,
						"Approvalstatus": "1",
						"Justification": justification,
						"Promocode": txtPromocode.getValue(),
						"Modifiedby": that.loggedInUser,
						"Reqbillpricecut": parseFloat(that.txtCut1),
						"Reqbillpriceroll": parseFloat(that.txtRoll1),
						"Reqnetpricecut": reqNetPriceCut,
						"Reqnetpriceroll": reqNetPriceRoll
					};
				} else if (this.selectedCat === "Resilient Sheet") {
					updateUrl = "pricing/InsertLimitedRS.xsjs";
					payload = {
						"Accountno": editPriceData.ACCOUNT__C,
						"Productuniquekey": editPriceData.PRODUCT_UNIQUE_KEY__C,
						"Whcode": this.selectedWH,
						"Cplpriceid": editPriceData.CPL_PRICE_ID__C,
						"Startdate": startDate,
						"Enddate": endDate,
						"Newstartdate": dpkStartdate,
						"Newenddate": dpkEnddate,
						"Cplrecordid": cplRecordId,
						"Approvalstatus": "1",
						"Justification": justification,
						"Promocode": txtPromocode.getValue(),
						"Modifiedby": that.loggedInUser,
						"Reqbillpricecut": parseFloat(that.txtCut1),
						"Reqbillpriceroll": parseFloat(that.txtRoll1),
						"Reqnetpricecut": reqNetPriceCut,
						"Reqnetpriceroll": reqNetPriceRoll
					};
				} else if (this.selectedCat === "Accessories") {
					updateUrl = "pricing/InsertLimitedACC.xsjs";
					payload = {
						"Accountno": editPriceData.ACCOUNT__C,
						"Productuniquekey": editPriceData.PRODUCT_UNIQUE_KEY__C,
						"Whcode": this.selectedWH,
						"Cplpriceid": editPriceData.CPL_PRICE_ID__C,
						"Startdate": startDate,
						"Enddate": endDate,
						"Newstartdate": dpkStartdate,
						"Newenddate": dpkEnddate,
						"Cplrecordid": cplRecordId,
						"Approvalstatus": "1",
						"Justification": justification,
						"Promocode": txtPromocode.getValue(),
						"Modifiedby": that.loggedInUser,
						"Reqbillprice": parseFloat(that.txtEach11),
						"Reqnetprice": reqNetPriceAcc
					};
				} else if (this.selectedCat === "Carpet Tile") {
					updateUrl = "pricing/InsertLimitedCT.xsjs";
					payload = {
						"Accountno": editPriceData.ACCOUNT__C,
						"Productuniquekey": editPriceData.PRODUCT_UNIQUE_KEY__C,
						"Whcode": this.selectedWH,
						"Cplpriceid": editPriceData.CPL_PRICE_ID__C,
						"Startdate": startDate,
						"Enddate": endDate,
						"Newstartdate": dpkStartdate,
						"Newenddate": dpkEnddate,
						"Cplrecordid": cplRecordId,
						"Approvalstatus": "1",
						"Justification": justification,
						"Promocode": txtPromocode.getValue(),
						"Modifiedby": that.loggedInUser,
						"Reqbillpricecarton": parseFloat(that.txtCarton11),
						"Reqbillpricepallet": parseFloat(that.txtCarton11),
						"Reqnetpricecarton": reqNetPriceCarton,
						"Reqnetpricepallet": reqNetPriceCarton
					};
				} else if (this.selectedCat === "Tile") {
					updateUrl = "pricing/InsertLimitedTile.xsjs";
					payload = {
						"Accountno": editPriceData.ACCOUNT__C,
						"Productuniquekey": editPriceData.PRODUCT_UNIQUE_KEY__C,
						"Whcode": this.selectedWH,
						"Cplpriceid": editPriceData.CPL_PRICE_ID__C,
						"Startdate": startDate,
						"Enddate": endDate,
						"Newstartdate": dpkStartdate,
						"Newenddate": dpkEnddate,
						"Cplrecordid": cplRecordId,
						"Approvalstatus": "1",
						"Justification": justification,
						"Promocode": txtPromocode.getValue(),
						"Modifiedby": that.loggedInUser,
						"Reqbillpricecarton": parseFloat(that.txtCarton11),
						"Reqbillpricepallet": parseFloat(that.txtCarton11),
						"Reqnetpricecarton": reqNetPriceCarton,
						"Reqnetpricepallet": reqNetPriceCarton
					};
				} else if (this.selectedCat === "TecWood") {
					updateUrl = "pricing/InsertLimitedTW.xsjs";
					payload = {
						"Accountno": editPriceData.ACCOUNT__C,
						"Productuniquekey": editPriceData.PRODUCT_UNIQUE_KEY__C,
						"Whcode": this.selectedWH,
						"Cplpriceid": editPriceData.CPL_PRICE_ID__C,
						"Startdate": startDate,
						"Enddate": endDate,
						"Newstartdate": dpkStartdate,
						"Newenddate": dpkEnddate,
						"Cplrecordid": cplRecordId,
						"Approvalstatus": "1",
						"Justification": justification,
						"Promocode": txtPromocode.getValue(),
						"Modifiedby": that.loggedInUser,
						"Reqbillpricecarton": parseFloat(that.txtCarton11),
						"Reqbillpricepallet": parseFloat(that.txtCarton11),
						"Reqnetpricecarton": reqNetPriceCarton,
						"Reqnetpricepallet": reqNetPriceCarton
					};
				} else if (this.selectedCat === "SolidWood") {
					updateUrl = "pricing/InsertLimitedSW.xsjs";
					payload = {
						"Accountno": editPriceData.ACCOUNT__C,
						"Productuniquekey": editPriceData.PRODUCT_UNIQUE_KEY__C,
						"Whcode": this.selectedWH,
						"Cplpriceid": editPriceData.CPL_PRICE_ID__C,
						"Startdate": startDate,
						"Enddate": endDate,
						"Newstartdate": dpkStartdate,
						"Newenddate": dpkEnddate,
						"Cplrecordid": cplRecordId,
						"Approvalstatus": "1",
						"Justification": justification,
						"Promocode": txtPromocode.getValue(),
						"Modifiedby": that.loggedInUser,
						"Reqbillpricecarton": parseFloat(that.txtCarton11),
						"Reqbillpricepallet": parseFloat(that.txtCarton11),
						"Reqnetpricecarton": reqNetPriceCarton,
						"Reqnetpricepallet": reqNetPriceCarton
					};
				} else if (this.selectedCat === "RevWood") {
					updateUrl = "pricing/InsertLimitedRW.xsjs";
					payload = {
						"Accountno": editPriceData.ACCOUNT__C,
						"Productuniquekey": editPriceData.PRODUCT_UNIQUE_KEY__C,
						"Whcode": this.selectedWH,
						"Cplpriceid": editPriceData.CPL_PRICE_ID__C,
						"Startdate": startDate,
						"Enddate": endDate,
						"Newstartdate": dpkStartdate,
						"Newenddate": dpkEnddate,
						"Cplrecordid": cplRecordId,
						"Approvalstatus": "1",
						"Justification": justification,
						"Promocode": txtPromocode.getValue(),
						"Modifiedby": that.loggedInUser,
						"Reqbillpricecarton": parseFloat(that.txtCarton11),
						"Reqbillpricepallet": parseFloat(that.txtCarton11),
						"Reqnetpricecarton": reqNetPriceCarton,
						"Reqnetpricepallet": reqNetPriceCarton
					};
				} else if (this.selectedCat === "Resilient Tile") {
					updateUrl = "pricing/InsertLimitedRT.xsjs";
					payload = {
						"Accountno": editPriceData.ACCOUNT__C,
						"Productuniquekey": editPriceData.PRODUCT_UNIQUE_KEY__C,
						"Whcode": this.selectedWH,
						"Cplpriceid": editPriceData.CPL_PRICE_ID__C,
						"Startdate": startDate,
						"Enddate": endDate,
						"Newstartdate": dpkStartdate,
						"Newenddate": dpkEnddate,
						"Cplrecordid": cplRecordId,
						"Approvalstatus": "1",
						"Justification": justification,
						"Promocode": txtPromocode.getValue(),
						"Modifiedby": that.loggedInUser,
						"Reqbillpricecarton": parseFloat(that.txtCarton11),
						"Reqbillpricepallet": parseFloat(that.txtCarton11),
						"Reqnetpricecarton": reqNetPriceCarton,
						"Reqnetpricepallet": reqNetPriceCarton
					};
				}
			}

			var cmtPayload = {
				"Cplrecordid": cplRecordId,
				"Comments": txtComment.getValue()
			};

			var that = this;
			sap.ui.getCore().busyIndicator.open();
			$.ajax({
				url: updateUrl,
				contentType: "application/json",
				method: "POST",
				async: false,
				data: JSON.stringify(payload),
				success: function (response) {
					console.log(response);
					var g = that;
					if(g.lmtdPrice === true) { // Added by <JAYANT PRAKASH> for <4080> on <01.09.2021>
					$.ajax({
						url: "pricing/Updatecplcomment.xsjs",
						contentType: "application/json",
						method: "POST",
						async: false,
						data: JSON.stringify(cmtPayload),
						success: function (response) {
							console.log(response);
							g.OnCancelJustification();
							MessageBox.success("Success! Record Inserted Successfully");
							g.fetchProducts();
							sap.ui.getCore().busyIndicator.close();
						},
						error: function (error) {
							console.log(error);
							sap.ui.getCore().busyIndicator.close();
						}
					});
					// Start of changes by <JAYANT PRAKASH> for <4080> on <01.09.2021>
					} else {
					$.ajax({
						url: "pricing/Updatecplcomment.xsjs",
						contentType: "application/json",
						method: "POST",
						async: false,
						data: JSON.stringify(cmtPayload),
						success: function (response) {
							console.log(response);
							g.OnCancelJustification();
							g.fetchProducts();
							sap.ui.getCore().busyIndicator.close();
						},
						error: function (error) {
							console.log(error);
							sap.ui.getCore().busyIndicator.close();
						}
					});	
					}	//End of changes by <JAYANT PRAKASH> for <4080> on <01.09.2021>

				},
				error: function (error) {
					console.log(error);
					sap.ui.getCore().busyIndicator.close();
				}
			});

		},

		// Start Remove Current Price - 1972
		onItemRemovePrice: function (oEvent) {
			var that = this;
			var selectedRow = oEvent.getSource().getParent().getParent().getParent();
			var removeData = {
				"cell1": selectedRow.getAggregation("cells")[1].getText(),
				"cell2": selectedRow.getAggregation("cells")[2].getText(),
				"cell3": selectedRow.getAggregation("cells")[3].getText(),
				"cell4": selectedRow.getAggregation("cells")[4].getText(),
				"cell5": selectedRow.getAggregation("cells")[5].getText(),
				"cell6": selectedRow.getAggregation("cells")[6].getText(),
				"cell7": selectedRow.getAggregation("cells")[7].getText()
			}

			var pViewModel = this.getView().getModel("pViewModel");
			var pViewData = pViewModel.getData();

			var tHeader = sap.ui.getCore().getModel("configModel").getProperty("/mHeader");

			var removePriceData = pViewData.filter(function (a) {
				a[tHeader[1].field.replace('PRODUCT__R.', '')] = typeof (a[tHeader[1].field.replace('PRODUCT__R.', '')]) === "number" ? "$ " + a[
					tHeader[1].field.replace('PRODUCT__R.', '')].toString() : a[tHeader[1].field.replace('PRODUCT__R.', '')];
				a[tHeader[2].field.replace('PRODUCT__R.', '')] = typeof (a[tHeader[2].field.replace('PRODUCT__R.', '')]) === "number" ? "$ " + a[
					tHeader[2].field.replace('PRODUCT__R.', '')].toString() : a[tHeader[2].field.replace('PRODUCT__R.', '')];
				a[tHeader[3].field.replace('PRODUCT__R.', '')] = typeof (a[tHeader[3].field.replace('PRODUCT__R.', '')]) === "number" ? "$ " + a[
					tHeader[3].field.replace('PRODUCT__R.', '')].toString() : a[tHeader[3].field.replace('PRODUCT__R.', '')];
				a[tHeader[4].field.replace('PRODUCT__R.', '')] = typeof (a[tHeader[4].field.replace('PRODUCT__R.', '')]) === "number" ? "$ " + a[
					tHeader[4].field.replace('PRODUCT__R.', '')].toString() : a[tHeader[4].field.replace('PRODUCT__R.', '')];
				a[tHeader[5].field.replace('PRODUCT__R.', '')] = typeof (a[tHeader[5].field.replace('PRODUCT__R.', '')]) === "number" ? "$ " + a[
					tHeader[5].field.replace('PRODUCT__R.', '')].toString() : a[tHeader[5].field.replace('PRODUCT__R.', '')];
				a[tHeader[6].field.replace('PRODUCT__R.', '')] = typeof (a[tHeader[6].field.replace('PRODUCT__R.', '')]) === "number" ? "$ " + a[
					tHeader[6].field.replace('PRODUCT__R.', '')].toString() : a[tHeader[6].field.replace('PRODUCT__R.', '')];

				return removeData.cell1 == a[tHeader[0].field.replace('PRODUCT__R.', '')] && removeData.cell2 == a[tHeader[1].field.replace(
					'PRODUCT__R.', '')] && removeData.cell3 == a[tHeader[2].field.replace('PRODUCT__R.', '')] && removeData.cell4 == a[tHeader[3].field
					.replace('PRODUCT__R.', '')] && removeData.cell5 == a[tHeader[4].field.replace('PRODUCT__R.', '')] && removeData.cell6 == a[
					tHeader[5].field.replace('PRODUCT__R.', '')] && removeData.cell7 == a[tHeader[6].field.replace('PRODUCT__R.', '')]
			});

			var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});

			for (var i = 0; i < pViewData.length; i++) {
				if (pViewData[i].CPL_PRICE_ID__C !== null) {
					if (pViewData[i].CPL_PRICE_ID__C === removePriceData[0].CPL_PRICE_ID__C) {
						if (pViewData[i].EDIT_START_DATE != null) {
							if (pViewData[i].EDIT_START_DATE.split("(").length > 1) {
								var startdate = pViewData[i].EDIT_START_DATE.split("(")[1].split(")")[0];
								pViewData[i].EDIT_START_DATE = dateFormat.format(new Date(parseInt(startdate)));
								removePriceData[0].EDIT_START_DATE = pViewData[i].EDIT_START_DATE;
							}
						}
						if (pViewData[i].EDIT_END_DATE != null) {
							if (pViewData[i].EDIT_END_DATE.split("(").length > 1) {
								var enddate = pViewData[i].EDIT_END_DATE.split("(")[1].split(")")[0];
								pViewData[i].EDIT_END_DATE = dateFormat.format(new Date(parseInt(enddate)));
								removePriceData[0].EDIT_END_DATE = pViewData[i].EDIT_END_DATE;
							}
						}
					}
				}
			}

			if (removePriceData[0].CPL_PRICE_ID__C.length === 13) {
				removePriceData[0].isLimitedPrice = true;
			} else {
				removePriceData[0].isLimitedPrice = false;
			}

			var removeModel = new JSONModel(removePriceData);
			this.getView().setModel(removeModel, "removeModel");
			
			//Start of changes by <JAYANT PRAKASH> for <4059> on <01.06.2021>
			//MessageBox.error("Are you Sure?", {
			MessageBox.error("Are you Sure - Remove the record from submission ?", { 
			//Endof changes by <JAYANT PRAKASH> for <4059> on <01.06.2021>
				title: "Remove Price",
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				emphasizedAction: "YES",
				onClose: function (sAction) {
					//sap.m.MessageToast.show("Action selected: " + );
					if (sAction === "YES") {
						if (removeModel.getData().length > 0) {
							if (removeModel.getData()[0].APPROVAL_STATUS__C === "4" || removeModel.getData()[0].APPROVAL_STATUS__C === "1") {
								that.onRemoveDraftPrice(removeModel.getData()[0].isLimitedPrice);
							} else {
								that.onRemoveCurrentPrice();
							}
						}

					} else {
						that.fetchProducts();
					}
				}
			});
		},

		onRemoveCurrentPrice: function () {

			var that = this;
			var removePriceData = this.getView().getModel("removeModel").getData();
			var removeUrl = "pricing/RemoveCurrentPrice.xsjs";
			var cplRecordId = new Date().getTime().toString();
			var startDate = removePriceData[0].EDIT_START_DATE;
			var endDate = removePriceData[0].EDIT_END_DATE;

			function removeCall() {
				var payload = {
					"Accountno": removePriceData[0].ACCOUNT__C,
					"Productuniquekey": removePriceData[0].PRODUCT_UNIQUE_KEY__C,
					"Whcode": that.selectedWH,
					"Cplpriceid": removePriceData[0].CPL_PRICE_ID__C,
					"Startdate": startDate,
					"Enddate": endDate,
					"Productcategory": that.selectedCat,
					"Cplrecordid": cplRecordId,
					"Approvalstatus": "4",
					"Modifiedby": that.loggedInUser,
				};
				var g = that;
				sap.ui.getCore().busyIndicator.open();
				$.ajax({
					url: removeUrl,
					contentType: "application/json",
					method: "POST",
					async: false,
					data: JSON.stringify(payload),
					success: function (response) {
						console.log(response);
						g.fetchProducts();
						sap.ui.getCore().busyIndicator.close();
					},
					error: function (error) {
						console.log(error);
						sap.ui.getCore().busyIndicator.close();
					}
				});
			}

			if (endDate !== "4000-12-31") {
				var std = new Date(startDate);
				var today = new Date();
				if (std > today) {
					if (removePriceData[0].PRICE_INCREASE_FLAG__C === "X") {
						MessageBox.error("Criteria is not matched");
						return;
					} else {
						removeCall();
					}
				} else {
					MessageBox.error("Criteria is not matched");
					return;
				}
			} else {
				removeCall();
			}
		},

		onRemoveDraftPrice: function (isLimitedPrice) {
			var that = this;
			var removePriceData = this.getView().getModel("removeModel").getData();
			var payload;
			var removeUrl;
			var cplRecordId = new Date().getTime().toString();
			var startDate = removePriceData[0].EDIT_START_DATE;
			var endDate = removePriceData[0].EDIT_END_DATE;
			if (isLimitedPrice === true) {
				removeUrl = "pricing/Removelimitedprice.xsjs";
				payload = {
					"Accountno": removePriceData[0].ACCOUNT__C,
					"Cplpriceid": removePriceData[0].CPL_PRICE_ID__C,
					"Enddate": endDate,
					"Productcategory": this.selectedCat,
					"Productuniquekey": removePriceData[0].PRODUCT_UNIQUE_KEY__C,
					"Startdate": startDate,
					"Whcode": this.selectedWH
				};
				sap.ui.getCore().busyIndicator.open();
				$.ajax({
					url: removeUrl,
					contentType: "application/json",
					method: "POST",
					async: false,
					data: JSON.stringify(payload),
					success: function (response) {
						console.log(response);
						that.fetchProducts();
						MessageBox.success("Success! Record is removed from Submission");
						sap.ui.getCore().busyIndicator.close();

					},
					error: function (error) {
						console.log(error);
						sap.ui.getCore().busyIndicator.close();
					}
				});
			} else {
				removeUrl = "pricing/Removedraftprice.xsjs";
				if (this.selectedCat === "Residential Broadloom" || this.selectedCat === "Commercial Broadloom" || this.selectedCat ===
					"Resilient Sheet") {
					payload = {
						"Accountno": removePriceData[0].ACCOUNT__C,
						"Productcategory": this.selectedCat,
						"Productuniquekey": removePriceData[0].PRODUCT_UNIQUE_KEY__C,
						"Whcode": this.selectedWH,
						"Cplpriceid": removePriceData[0].CPL_PRICE_ID__C,
						"Startdate": startDate,
						"Enddate": endDate,
						"Cplrecordid": "",
						"Approvalstatus": "",
						"Justification": "",
						"Promocode": "",
						"Modifiedby": "",
						"Reqbillpricecut": 0,
						"Reqbillpriceroll": 0,
						"Reqnetpricecut": 0,
						"Reqnetpriceroll": 0
					};
				} else if (this.selectedCat === "Carpet Tile" || this.selectedCat === "Tile" || this.selectedCat === "TecWood" || this.selectedCat ===
					"SolidWood" || this.selectedCat === "RevWood" || this.selectedCat === "Resilient Tile") {
					payload = {
						"Accountno": removePriceData[0].ACCOUNT__C,
						"Productcategory": this.selectedCat,
						"Productuniquekey": removePriceData[0].PRODUCT_UNIQUE_KEY__C,
						"Whcode": this.selectedWH,
						"Cplpriceid": removePriceData[0].CPL_PRICE_ID__C,
						"Startdate": startDate,
						"Enddate": endDate,
						"Cplrecordid": "",
						"Approvalstatus": "",
						"Justification": "",
						"Promocode": "",
						"Modifiedby": "",
						"Reqbillpricecarton": 0,
						"Reqbillpricepallet": 0,
						"Reqnetpricecarton": 0,
						"Reqnetpricepallet": 0
					};
				} else if (this.selectedCat === "Accessories") {
					payload = {
						"Accountno": removePriceData[0].ACCOUNT__C,
						"Productcategory": this.selectedCat,
						"Productuniquekey": removePriceData[0].PRODUCT_UNIQUE_KEY__C,
						"Whcode": this.selectedWH,
						"Cplpriceid": removePriceData[0].CPL_PRICE_ID__C,
						"Startdate": startDate,
						"Enddate": endDate,
						"Cplrecordid": "",
						"Approvalstatus": "",
						"Justification": "",
						"Promocode": "",
						"Modifiedby": "",
						"Reqbillprice": 0,
						"Reqnetprice": 0
					};
				}
				sap.ui.getCore().busyIndicator.open();
				$.ajax({
					url: removeUrl,
					contentType: "application/json",
					method: "POST",
					async: false,
					data: JSON.stringify(payload),
					success: function (response) {
						console.log(response);
						that.fetchProducts();
						MessageBox.success("Success! Record is removed from Submission");
						sap.ui.getCore().busyIndicator.close();
					},
					error: function (error) {
						console.log(error);
						sap.ui.getCore().busyIndicator.close();
					}
				});
			}
		},
		//End of  Remove Current Price - 1972

		//Start of Edit Limited Price
		onItemEditLimited: function (oEvent) {
			var selectedRow = oEvent.getSource().getParent().getParent().getParent();
			var selectedRow = oEvent.getSource().getParent().getParent().getParent();
			var editLimitedData = {
				"cell1": selectedRow.getAggregation("cells")[1].getText(),
				"cell2": selectedRow.getAggregation("cells")[2].getText(),
				"cell3": selectedRow.getAggregation("cells")[3].getText(),
				"cell4": selectedRow.getAggregation("cells")[4].getText(),
				"cell5": selectedRow.getAggregation("cells")[5].getText(),
				"cell6": selectedRow.getAggregation("cells")[6].getText(),
				"cell7": selectedRow.getAggregation("cells")[7].getText()
			}
			this.editLimitedData = editLimitedData;

			var pViewModel = this.getView().getModel("pViewModel");
			var pViewData = pViewModel.getData();

			var that = this;
			this.isLimitedTimeRecord = pViewData.filter(function (a) {
				return a.PRODUCT_STYLE_NUMBER__C === that.editLimitedData.cell1 && a.ISLIMITEDPRICERECORD === true;
			});

			that.openDialogLimitedPrice(editLimitedData);
		},

		openDialogLimitedPrice: function (editLimitedData) {
			if (!this._oDialogLimitedPrice) {
				this._oDialogLimitedPrice = sap.ui.xmlfragment("cf.cpl.fragments.EditLimitedPrice", this);
				this.getView().addDependent(this._oDialogLimitedPrice);
			}
			this._oDialogLimitedPrice.setModel();
			this._oDialogLimitedPrice.open();
			// Previous error message remove
			var errormsg = sap.ui.getCore().byId("errormsg");
			errormsg.setVisible(false);
			errormsg.setText("");

			sap.ui.getCore().byId("sbDays").setSelectedItem("-1");
			var today = new Date();
			var tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);
			sap.ui.getCore().byId("dpkStartdate").setDateValue(tomorrow);
			sap.ui.getCore().byId("dpkStartdate").setValue(tomorrow.toLocaleString('default', {
				day: "numeric",
				month: 'long',
				year: "numeric"
			}));

			var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "dd MMMM yyyy"
			});
			//Start of changes by <AYUGAHLO> for <4058> on <01.08.2021>
			//sap.ui.getCore().byId("hiddenEnddate").setValue(today.toLocaleString('default', {
			sap.ui.getCore().byId("hiddenEnddate").setValue(tomorrow.toLocaleString('default', {
			//End of changes by <AYUGAHLO> for <4058> on <01.08.2021>	
				day: "numeric",
				month: 'long',
				year: "numeric"
			}));
		},

		OnCancelLimitedPrice: function () {
				var dpkEnddate = sap.ui.getCore().byId("dpkEnddate").setValue("");
			this._oDialogLimitedPrice.close();
			//	this.fetchProducts();
		},

		afterCloseLimitedPrice: function () {
			if (this._oDialogLimitedPrice) {
				this._oDialogLimitedPrice.destroy();
				this._oDialogLimitedPrice = null;
			}
		},

		onSaveDate: function () {
			var that = this;
			var dpkStartdate = sap.ui.getCore().byId("dpkStartdate");
			var dpkEnddate = sap.ui.getCore().byId("dpkEnddate");
			that.EndDate = dpkEnddate.getValue();
			var errormsg = sap.ui.getCore().byId("errormsg");

			var currDate = new Date();
			currDate.setFullYear(currDate.getFullYear() + 1);

			if (dpkStartdate.getValue() === "") {
				dpkStartdate.setValueState("Error");
				return false;
			} else {
				dpkStartdate.setValueState("None");
			}
			if (dpkEnddate.getValue() === "") {
				dpkEnddate.setValueState("Error");
				return false;
			} else {
				dpkEnddate.setValueState("None");
			}

			if (new Date(dpkStartdate.getValue()) < new Date()) {
				errormsg.setVisible(true);
				errormsg.setText("Start date should be greater then today");
				return false;
			} else if (new Date(dpkEnddate.getValue()) < new Date(dpkStartdate.getValue())) {
				errormsg.setVisible(true);
				errormsg.setText("End date should not be less then Start date");
				return false;
			} else if (new Date(dpkEnddate.getValue()) > currDate) {
				errormsg.setVisible(true);
				errormsg.setText("End date should not be more than 1 year");
				return false;
			} else {
				errormsg.setVisible(false);
				errormsg.setText("");
			}

			//Start of  check created limited time price record exist or not 
			var startDate = new Date(dpkStartdate.getValue());
			var endDate = new Date(dpkEnddate.getValue());

			if (that.isLimitedTimeRecord.length > 0) {
				for (var i = 0; i < that.isLimitedTimeRecord.length; i++) {
					var sDate = new Date(that.isLimitedTimeRecord[i].START_DATE__C);
					var eDate = new Date(that.isLimitedTimeRecord[i].END_DATE__C);

					if (startDate >= sDate && startDate <= eDate) {
						MessageBox.information("Limited Time Price record is already created");
						return false;
					} else if (endDate >= sDate && endDate <= eDate) {
						MessageBox.information("Limited Time Price record is already created");
						return false;
					} else if ((startDate <= sDate && endDate <= eDate) && endDate > sDate) {
						MessageBox.information("Limited Time Price record is already created");
						return false;
					} else if (startDate <= sDate && endDate >= eDate) {
						MessageBox.information("Limited Time Price record is already created");
						return false;
					}
				}
			}
			//End of  check created limited time price record exist or not 

			// Temp - SP
			that.lmtdPrice = true;
			that.dpkStartdate = dpkStartdate.getValue();
			that.dpkEnddate = dpkEnddate.getValue();

			this._oDialogLimitedPrice.close();
			that.afterCloseLimitedPrice();
			that.openDialogPgSurface(this.editLimitedData);
			this.showbackbtn("1");
		},

		onChangeDays: function (oEvent) {

			var btnKey = parseInt(oEvent.getParameters().item.getKey());

			var dpkStartdate = sap.ui.getCore().byId("dpkStartdate");
			var dpkEnddate = sap.ui.getCore().byId("dpkEnddate");

			var hiddenEnddate = sap.ui.getCore().byId("hiddenEnddate");
			var newEnddate = new Date(hiddenEnddate.getValue());
			if (btnKey === 365) {
				newEnddate = new Date("12-31-" + new Date().getFullYear());
			} else {
				newEnddate.setDate(newEnddate.getDate() + btnKey);
			}

			dpkEnddate.setValue(newEnddate.toLocaleString('default', {
				day: "numeric",
				month: 'long',
				year: "numeric"
			}));

		},

		showbackbtn: function (val) {
			// Back button show logic
			var btnBack = sap.ui.getCore().byId("btnBack");
			if (val === "0") {
				btnBack.setVisible(false);
			} else {
				btnBack.setVisible(true);
			}
		},

		OnBackLimitedPrice: function (oEvent) {
			var that = this;
			this._oDialogPGsurface.close();
			that.afterClosePGSurface();
			that.openDialogLimitedPrice();
			var dpkEnddate = sap.ui.getCore().byId("dpkEnddate").setValue(this.EndDate);
		},

		//End of Edit Limited Price

		/*onReset: function (oEvent) {
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
		},*/

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * After list data is available, this handler method updates the
		 * master list counter
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished: function (oEvent) {
			// update the master list object counter after new data is loaded
			this._updateListItemCount(oEvent.getParameter("total"));
		},

		onGlobalSearch: function (oEvent) {
			if (oEvent.getParameters().clearButtonPressed) {
				this.onReset();
				return;
			}

			if (this.selectedCat === undefined || this.selectedCat === "") {
				MessageBox.error("Please select valid product category and try again");
				return;
			}

			var that = this;
			var pViewModel = new JSONModel();
			var sQuery = oEvent.getParameter("query");
			sQuery = sQuery.toUpperCase();

			this.globalSearchValue = sQuery;
			var oTable = this.getView().byId("list");
			var oTable2 = this.getView().byId("list2");

			if (this.accNo !== "" && this.accNo !== undefined) {
				var url = "pricing/GBSCPLview.xsjs?globalsearchKey=" + sQuery + "&Productcategory=" + this.selectedCat + "&accountNo1=" + this.accNo +
					"&accountNo2=NA&$format=json";
			} else {
				var url = "pricing/GBSCPLview.xsjs?globalsearchKey=" + sQuery + "&Productcategory=" + this.selectedCat +
					"&accountNo1=NA&accountNo2=NA&$format=json";
			}
			sap.ui.getCore().busyIndicator.open();
			if (sQuery && sQuery.length > 0) {
				$.ajax({
					url: url,
					contentType: "application/json",
					type: 'GET',
					dataType: "json",
					async: false,
					success: function (response) {

						pViewModel.setData(response.results);
						var pViewData = response.results;
						for (var i = 0; i < pViewData.length; i++) {
							pViewData[i].SELLING_STYLE_CONCAT__C = pViewData[i].PRODUCT_NAME__C + "(" + pViewData[i].PRODUCT_STYLE_NUMBER__C + ")";
							// pViewData[i].NAME = pViewData[i].PRODUCT_NAME__C + "(" + pViewData[i].SELLING_STYLE_NUM__C + ")";
							pViewData[i].NAME = pViewData[i].PRODUCT_NAME__C;
							pViewData[i].MASTER_STYLE_CONCAT__C = pViewData[i].MASTER_STYLE_NAME__C + "(" + pViewData[i].MASTER_STYLE_NUM__C + ")";
							pViewData[i].INVENTORY_STYLE_CONCAT__C = pViewData[i].INVENTORY_STYLE_NAME__C + "(" + pViewData[i].INVENTORY_STYLE_NUM__C +
								")";
							pViewData[i].TM3_PRICE_CONCAT__C = pViewData[i].INVENTORY_STYLE_NAME__C + "(" + pViewData[i].INVENTORY_STYLE_NUM__C + ")";
						}
						sap.ui.getCore().setModel(pViewModel, "pViewModel");
						that.getView().setModel(pViewModel, "pViewModel");

						var whData = [{
							"key": 0,
							"WAREHOUSE_CODE__C": "",
							"WAREHOUSE_CODE__DESC": ""
						}];

						var brandData = [];

						for (var j = 0; j < pViewData.length; j++) {
							var tempWH = {
								"key": j + 1,
								"WAREHOUSE_CODE__C": pViewData[j].WAREHOUSE_CODE__C,
								"WAREHOUSE_CODE__DESC": pViewData[j].WAREHOUSE_CODE__DESC
							};
							var whAdded = false;
							for (var s = 0; s < whData.length; s++) {
								if (pViewData[j].WAREHOUSE_CODE__C === whData[s].WAREHOUSE_CODE__C) {
									whAdded = true;
								}
							}
							if (whAdded === false) {
								whData.push(tempWH);
							}

							var tempBrand = {
								"key": j + 1,
								"brand": pViewData[j].BRAND_CODE__C
							};
							var brandAdded = false;
							for (var s = 0; s < brandData.length; s++) {
								if (pViewData[j].BRAND_CODE__C === brandData[s].brand) {
									brandAdded = true;
								}
							}
							if (brandAdded === false) {
								brandData.push(tempBrand);
							}
						}

						var whModel = new JSONModel(whData);
						that.getView().setModel(whModel, "warehouses");
						that.getView().byId("wh").setModel(whModel, "warehouses");
						that.getView().byId("wh").setSelectedKey(0);
						that.getView().byId("wh2").setModel(whModel, "warehouses");
						that.getView().byId("wh2").setSelectedKey(0);

						var allBrands = that.getView().byId("brand").getModel("brandModel").getProperty("/allBrand");
						if (allBrands === undefined) {
							allBrands = that.getView().byId("brand2").getModel("brandModel").getProperty("/allBrand");
						}
						var temSales = [{
							"key": 0,
							"channel": ""
						}];

						for (var i = 0; i < brandData.length; i++) {
							var chnlAdded = false;
							for (var k = 0; k < allBrands.length; k++) {
								if (brandData[i].brand === allBrands[k].BRAND_CODE__C) {
									for (var l = 0; l < temSales.length; l++) {
										if (temSales[l].SALES_CHANNEL__C === allBrands[k].SALES_CHANNEL__C) {
											chnlAdded = true;
										}
									}
									if (chnlAdded === false) {
										var tempBrand = {
											"key": i + 1,
											"channel": allBrands[k].SALES_CHANNEL__C
										};
										temSales.push(tempBrand);
									}
								}
							}
						}

						that.getView().getModel("brandModel").setProperty("/allChannel", temSales);
						that.getView().byId("brand").setSelectedKey(0);
						that.getView().byId("brand2").setSelectedKey(0);

						// that.selectedCat = "";
						that.selectedWH = "";
						that.selectedChannel = "";

						oTable.removeAllItems();
						oTable.removeAllColumns();

						oTable2.removeAllItems();
						sap.ui.getCore().busyIndicator.close();

						// that.bindRecords();
					},
					error: function (error) {
						console.log(error);
						sap.ui.getCore().busyIndicator.close();
					}
				});
			}

		},

		/**
		 * Event handler for the master search field. Applies current
		 * filter value and triggers a new search. If the search field's
		 * 'refresh' button has been pressed, no new search is triggered
		 * and the list binding is refresh instead.
		 * @param {sap.ui.base.Event} oEvent the search event
		 * @public
		 */
		onSearch: function (oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
				return;
			}

			var header = sap.ui.getCore().getModel("configModel").getProperty("/mHeader");
			var width = this.getView()._oContextualSettings.contextualWidth;
			if (width > 700) {
				var f0 = header[0].field.includes("PRODUCT__R.") ? header[0].field.replace("PRODUCT__R.", "") : header[0].field;
				var f1 = header[1].field.includes("PRODUCT__R.") ? header[1].field.replace("PRODUCT__R.", "") : header[1].field;
				var f2 = header[2].field.includes("PRODUCT__R.") ? header[2].field.replace("PRODUCT__R.", "") : header[2].field;
				var f3 = header[3].field.includes("PRODUCT__R.") ? header[3].field.replace("PRODUCT__R.", "") : header[3].field;
			} else {
				var f0 = "intro";
				var f1 = "title";
				var f2 = "number";
				var f3 = "numUnit";
			}
			var aFilters = [];
			var sQuery = oEvent.getParameter("query");
			if (sQuery && sQuery.length > 0) {
				var filter1 = new Filter(f0, FilterOperator.Contains, sQuery);
				var filter2 = new Filter(f1, FilterOperator.Contains, sQuery);
				var filter3 = new Filter(f2, FilterOperator.Contains, sQuery);
				var filter4 = new Filter(f3, FilterOperator.Contains, sQuery);
				aFilters.push(filter1, filter2, filter3, filter4);

				var oFilter = new Filter(aFilters);

				var oList = this.byId("list");
				var oBinding = oList.getBinding("items");
				oBinding.filter(oFilter, "Application");
				var oList2 = this.byId("list2");
				var oBinding2 = oList2.getBinding("items");
				oBinding2.filter(oFilter, "Application");
			} else {
				this.bindRecords();

			}

		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh: function () {
			this._oList.getBinding("items").refresh();
			this.setModel(this.oModel, "MasterModel");
			this.getModel("MasterModel").refresh();
		},

		/**
		 * Event handler for the filter, sort and group buttons to open the ViewSettingsDialog.
		 * @param {sap.ui.base.Event} oEvent the button press event
		 * @public
		 */
		onSortDialog: function (oEvent) {
			var sDialogTab = "sort";

			var headerData = sap.ui.getCore().getModel("configModel").getProperty("/mHeader");

			// load asynchronous XML fragment
			if (!this.sortDialog) {
				this.sortDialog = sap.ui.xmlfragment("cf.cpl.fragments.ViewSettingsDialog", this);
				this.getView().addDependent(this.sortDialog);
				for (var i = 0; i < headerData.length; i++) {
					if (headerData[i].header !== "") { // Pratik 04-11-2020 - 3250
						headerData[i].field = headerData[i].field.includes("PRODUCT__R.") ? headerData[i].field.replace("PRODUCT__R.", "") :
							headerData[
								i]
							.field;
						var oCustomSortItem = new sap.m.ViewSettingsItem({
							key: headerData[i].field,
							text: headerData[i].header
						});
						this.sortDialog.addSortItem(oCustomSortItem);
					} // Pratik 04-11-2020 - 3250
				}

				if (Device.system.desktop) {
					this.sortDialog.addStyleClass("sapUiSizeCompact");
				}
			}
			this.sortDialog.open();
		},

		handleConfirm: function (oEvent) {
			var oTable = this.byId("list"),
				mParams = oEvent.getParameters(),
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

		/**
		 * Event handler called when ViewSettingsDialog has been confirmed, i.e.
		 * has been closed with 'OK'. In the case, the currently chosen filters, sorters or groupers
		 * are applied to the master list, which can also mean that they
		 * are removed from the master list, in case they are
		 * removed in the ViewSettingsDialog.
		 * @param {sap.ui.base.Event} oEvent the confirm event
		 * @public
		 */
		onConfirmViewSettingsDialog: function (oEvent) {
			var aFilterItems = oEvent.getParameters().filterItems,
				aFilters = [],
				aCaptions = [];
		},

		/**
		 * Event handler for the list selection event
		 * @param {sap.ui.base.Event} oEvent the list selectionChange event
		 * @public
		 */
		onSelectionChange: function (oEvent) {
			// console.log(oEvent);
			// console.log(this);
			// var width = oEvent.getSource()._oContextualSettings.contextualWidth;
			// if(width > 700) {
			this.getView().byId("masterPage").setVisible(false);
			this.getView().byId("masterPage2").setVisible(true);
			this._oList = this.byId("list2");
			var oList = oEvent.getSource(),
				bSelected = oEvent.getParameter("selected");

			// skip navigation when deselecting an item in multi selection mode
			if (!(oList.getMode() === "MultiSelect" && !bSelected)) {
				this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource()); // temporary changed.. enable it later
			}
		},

		/**
		 * Event handler for the bypassed event, which is fired when no routing pattern matched.
		 * If there was an object selected in the master list, that selection is removed.
		 * @public
		 */
		onBypassed: function () {
			this._oList.removeSelections(true);
		},

		/**
		 * Used to create GroupHeaders with non-capitalized caption.
		 * These headers are inserted into the master list to
		 * group the master list's items.
		 * @param {Object} oGroup group whose text is to be displayed
		 * @public
		 * @returns {sap.m.GroupHeaderListItem} group header with non-capitalized caption.
		 */
		createGroupHeader: function (oGroup) {
			return new GroupHeaderListItem({
				title: oGroup.text,
				upperCase: false
			});
		},

		/**
		 * Event handler for navigating back.
		 * We navigate back in the browser historz
		 * @public
		 */
		onNavBack: function () {
			// eslint-disable-next-line sap-no-history-manipulation
			history.go(-1);
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		_createViewModel: function () {
			return new JSONModel({
				isFilterBarVisible: false,
				filterBarLabel: "",
				delay: 0,
				title: this.getResourceBundle().getText("masterTitleCount", [0]),
				noDataText: this.getResourceBundle().getText("masterListNoDataText"),
				sortBy: "Mstr#",
				groupBy: "None"
			});
		},

		_onMasterMatched: function (oEvent) {
			//Set the layout property of the FCL control to 'OneColumn'
			this.getModel("appView").setProperty("/layout", "OneColumn");
			var width = this.getView()._oContextualSettings.contextualWidth;
			if (width > 700) {
				this._oList = this.byId("list");
				this.getView().byId("masterPage2").setVisible(false);
				this.getView().byId("masterPage").setVisible(true);
				this.getView().byId("searchField3").setValue("");
				this.bindRecords();
			} else {
				this._oList = this.byId("list2");
				this.getView().byId("masterPage2").setVisible(true);
				this.getView().byId("masterPage").setVisible(false);
			}
		},

		/**
		 * Shows the selected item on the detail page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showDetail: function (oItem) {
			var bReplace = !Device.system.phone;
			// set the layout property of FCL control to show two columns
			// var path = this.path;
			var priceData = this.getView().getModel("pViewModel").getData();
			var headerData = sap.ui.getCore().getModel("configModel").getProperty("/mHeader");
			var h0 = headerData[0].field.includes("PRODUCT__R.") ? headerData[0].field.replace("PRODUCT__R.", "") : headerData[0].field;
			var h1 = headerData[1].field.includes("PRODUCT__R.") ? headerData[1].field.replace("PRODUCT__R.", "") : headerData[1].field;
			var h2 = headerData[2].field.includes("PRODUCT__R.") ? headerData[2].field.replace("PRODUCT__R.", "") : headerData[2].field;
			var h3 = headerData[3].field.includes("PRODUCT__R.") ? headerData[3].field.replace("PRODUCT__R.", "") : headerData[3].field;

			var width = this.getView()._oContextualSettings.contextualWidth;
			if (width) {
				if (width < 700) {
					var that = this;
					var selected = priceData.filter(function (a) {
						if (a[h0] === undefined || a[h0] === null) {
							a[h0] = "";
						}
						if (a[h1] === undefined || a[h1] === null) {
							a[h1] = "";
						}
						if (a[h2] === undefined || a[h2] === null) {
							a[h2] = "";
						}
						if (a[h3] === undefined || a[h3] === null) {
							a[h3] = "";
						}
						return a[h0] === oItem.getNumber() && a[h1] === oItem.getTitle() && a[h2] === oItem
							.getIntro() && a[h3] === oItem.getNumberUnit();
					});
					sap.ui.getCore().getModel("configModel").setProperty("/selectedItem", selected[0]);

					this.getRouter().navTo("object", {
						objectId: oItem.getNumber()
					}, bReplace);
				} else {
					var selected = priceData.filter(function (a) {
						if (a[h0] === undefined || a[h0] === null) {
							a[h0] = "";
						}
						if (a[h1] === undefined || a[h1] === null) {
							a[h1] = "";
						}
						if (a[h2] === undefined || a[h2] === null) {
							a[h2] = "";
						}
						if (a[h3] === undefined || a[h3] === null) {
							a[h3] = "";
						}
						return a[h0] === oItem.getAggregation("cells")[1].getText() && a[h1] === oItem.getAggregation("cells")[2].getText() && a[
							h2] === oItem.getAggregation("cells")[3].getText() && a[h3] === oItem.getAggregation("cells")[4].getText();
					});
					sap.ui.getCore().getModel("configModel").setProperty("/selectedItem", selected[0]);
					this.getRouter().navTo("object", {
						objectId: oItem.getAggregation("cells")[1].getText()
							// path: path
					}, bReplace);
				}
			} else {
				if (this.getView().byId("masterPage2").getVisible()) {
					var selected = priceData.filter(function (a) {
						if (a[h0] === undefined || a[h0] === null) {
							a[h0] = "";
						}
						if (a[h1] === undefined || a[h1] === null) {
							a[h1] = "";
						}
						if (a[h2] === undefined || a[h2] === null) {
							a[h2] = "";
						}
						if (a[h3] === undefined || a[h3] === null) {
							a[h3] = "";
						}
						return a[h0] === oItem.getNumber() && a[h1] === oItem.getTitle() && a[h2] === oItem
							.getIntro() && a[h3] === oItem.getNumberUnit();
					});
					sap.ui.getCore().getModel("configModel").setProperty("/selectedItem", selected[0]);
					this.getRouter().navTo("object", {
						objectId: oItem.getNumber()
					}, bReplace);
				} else {
					var selected = priceData.filter(function (a) {
						if (a[h0] === undefined || a[h0] === null) {
							a[h0] = "";
						}
						if (a[h1] === undefined || a[h1] === null) {
							a[h1] = "";
						}
						if (a[h2] === undefined || a[h2] === null) {
							a[h2] = "";
						}
						if (a[h3] === undefined || a[h3] === null) {
							a[h3] = "";
						}
						return a[h0] === oItem.getAggregation("cells")[1].getText() && a[h1] === oItem.getAggregation("cells")[2].getText() && a[
							h2] === oItem.getAggregation("cells")[3].getText() && a[h3] === oItem.getAggregation("cells")[4].getText();
					});
					sap.ui.getCore().getModel("configModel").setProperty("/selectedItem", selected[0]);
					this.getRouter().navTo("object", {
						objectId: oItem.getAggregation("cells")[1].getText()
							// path: path
					}, bReplace);
				}
			}

			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
		},

		/**
		 * Sets the item count on the master list header
		 * @param {integer} iTotalItems the total number of items in the list
		 * @private
		 */
		_updateListItemCount: function (iTotalItems) {
			var sTitle;
			// only update the counter if the length is final
		},

		sortTHeader: function (objA, objB) {
			return objA.key - objB.key;
		},
		loadOnScroll: function (e) {
			if ($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight) {
				console.log('This is the bottom of the container');
				if (this.globalSearch === false) {
					if (e.data.g.endResult === false) {
						e.data.g.fetchTotal = e.data.g.fetchTotal + 100;
						e.data.g.fetchSkip = e.data.g.fetchSkip + 100;
						e.data.g.fetchProducts();
					}
				}
			}
		},

		//To Set Comments Value state to Success

		OnComment: function () {

			var oComment = sap.ui.getCore().byId("txtComment");
			var lblcommenterrmsg = sap.ui.getCore().byId("lblcommenterrmsg");
			oComment.setValueState("Success");
			lblcommenterrmsg.setVisible(false);

		},
		
		
		// Add new Product 
		onAddProduct: function() {
			this.getRouter().navTo("addProduct");
		}
	});

});