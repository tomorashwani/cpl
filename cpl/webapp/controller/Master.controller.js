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
	"../model/formatter"
], function (BaseController, JSONModel, Filter, Sorter, FilterOperator, GroupHeaderListItem, Device, Fragment, MessageBox, formatter) {
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

			// this.setModel(oViewModel, "masterView");

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

			this.proCat = {
				"ProductCategory": [{
					"key": "",
					"name": ""
				}, {
					"key": "Residential Broadloom",
					"name": "Residential Broadloom"
				}, {
					"key": "Resilient Tile",
					"name": "Resilient Tile"
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

			var lModel = new JSONModel(this.proCat);
			this.getView().setModel(lModel, "local");
			this.getView().byId("prodCat").setModel(lModel, "local");
			this.getView().byId("prodCat2").setModel(lModel, "local");

			var localData = this.getOwnerComponent().getModel("local").getData();
			this.filterData = localData.FilterMapping;

			this.getView().byId("masterPage2").setVisible(false);
			this.getView().byId("masterPage").setVisible(true);

			// this.user = 'Ashley Nalley';
			var that = this;
			var appName = "Customer_Price_List";
			this.loggedInUser = "";

			// Catalogue Service:
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
				},
				error: function (error) {}
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

			$.ajax({
				// url: "pricing/PriceGrid.xsodata/Warehouse",
				url: whURL,
				contentType: "application/json",
				type: 'GET',
				dataType: "json",
				async: false,
				success: function (response) {
					//var oModel = new sap.ui.model.json.JSONModel(response.d.results);
					//that.getView().byId("order").setModel(oModel);
					//console.log(response.d.results);

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

					// that.warehouses = response.d.results;

					that.warehouses.unshift({
						"WAREHOUSE_CODE__C": "",
						"WAREHOUSE_CODE__DESC": ""
					});
					if (response.d.results[0]) {
						that.selectedWH = response.d.results[0].WAREHOUSE_CODE__C;
					}
					var oModel = new JSONModel(that.warehouses);
					that.byId("wh").setModel(oModel, "warehouses");
					that.byId("wh2").setModel(oModel, "warehouses");
				},
				error: function (error) {
					that.warehouses = false;
				}
			});

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

					that.getView().byId("masterPage2").setVisible(false);
					that.getView().byId("masterPage").setVisible(true);
				},
				error: function (error) {}
			});

		},

		onAfterRendering: function (oEvent) {

			var that = this;
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
							// that.userRole = response.d.results[0].ROLE;
							g.empNo = response.d.results[0].EMPLOYEENUMBER;
							g._getTerritoryUser(g.empNo);
						}
						// sap.ui.getCore().getModel("configModel").setProperty("/userRole", that.userRole);
					},
					error: function (error) {}
				});
			});

			// this.loggedInUser = "Saradha_Varadharajan@mohawkind.com";

			// this.selectedCat = document.getElementById('container-cpl-prodCat-labelText').innerHTML;

			$("#container-cpl---master--list").on('scroll', {
				g: this
			}, this.loadOnScroll);
			var lsModel = new JSONModel();
			this.getView().setModel(lsModel, "listModel");
			var pViewModel = new JSONModel();
			this.getView().setModel(pViewModel, "pViewModel");
			this._filterDisable();

			// var pViewModel = sap.ui.getCore().getModel("pViewModel");
			// this.getView().setModel(pViewModel, "pViewModel");
			// var pViewData = pViewModel.getData();

			// var tCol = localData.Column;
			var priceModel = new JSONModel();
			//this.selectedCat = document.getElementById('container-cpl---App--prodCat-labelText').innerHTML;
			/*for (var cat = 0; cat < this.CatProValues.length; cat++) {
				if (this.CatProValues[cat].sfCat == this.selectedCat) {
					this.selectedCatPro = this.CatProValues[cat].cat;
					break;
				}
			}*/
			// this.selectedWH = document.getElementById('container-cpl---App--wh-labelText').innerHTML;
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
			$.ajax({
				// url: "pricing/PriceGrid.xsodata/TerritoryUser?$filter=CAMS_EMPLOYEE_NUM__C eq '" + empNo + "'",
				url: "pricing/PriceGrid.xsodata/TerritoryUser",
				contentType: "application/json",
				type: 'GET',
				dataType: "json",
				async: false,
				success: function (response) {
					/*if (response.d.results.length > 0) {
						that.userRole = response.d.results[0].ROLE;
					}
					sap.ui.getCore().getModel("configModel").setProperty("/userRole", that.userRole);*/
					var territoryData = response.d.results;
					sap.ui.getCore().getModel("configModel").setProperty("/territoryData", territoryData);
					that._roleGrp(territoryData, empNo);
				},
				error: function (error) {}
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
			$.ajax({
				url: "pricing/PriceGrid.xsodata/AccountProductUser?$filter=" + accPrdFilter,
				contentType: "application/json",
				type: 'GET',
				dataType: "json",
				async: false,
				success: function (response) {
					var data = response.d.results;
					var brCode = [];
					var productCode = [];
					for (var i = 0; i < data.length; i++) {
						brCode.push(data[i].BRAND_CODE__C);
						productCode.push(data[i].PRODUCT_TYPE__C);
					}

					for (var t = 0; t < brCode.length; t++) {
						var tempBrCode = {
							"brand": brCode[t]
						};
						var brAdded = false;
						for (var s = 0; s < that.brCode.length; s++) {
							if (that.brCode[s].brand === tempBrCode.brand) {
								brAdded = true;
							}
						}
						if (brAdded === false) {
							that.brCode.push(tempBrCode);
						}
					}

					for (var v = 0; v < productCode.length; v++) {
						var tempProCode = {
							"proCode": productCode[v]
						};
						var proAdded = false;
						for (var s = 0; s < that.productCode.length; s++) {
							if (that.productCode[s].proCode === tempProCode.proCode) {
								proAdded = true;
							}
						}
						if (proAdded === false) {
							that.productCode.push(tempProCode);
						}
					}

					/*that.brCode = brCode;
					that.productCode = productCode;*/
					sap.ui.getCore().getModel("configModel").setProperty("/brCode", that.brCode);
					sap.ui.getCore().getModel("configModel").setProperty("/productCode", that.productCode);
				},
				error: function (error) {}
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
		onFilter: function () {
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
					//

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

		handlePressClose: function () {
			this.byId("filter").close();
		},

		onCategoryChange: function (oEvent) {
			this.selectedCat = oEvent.getParameters().value;
			this.fetchTotal = 100;
			this.fetchSkip = 0;
			this._filterDisable();
			if (this.sortDialog) {
				this.sortDialog.destroy();
				delete this.sortDialog;
			}
			this.fetchProducts();
			//Start of Pratik 04-11-2020//	
			/*var oTable = this.byId("list"),
				oBinding = oTable.getBinding("items"),
				aSorters = [];
			aSorters.push(new Sorter("NAME", false));
			oBinding.sort(aSorters);*/
			//End of Pratik 04-11-2020//	
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
		},

		fetchProducts: function () {
			var brand = this.byId("brand").getModel("brandModel").getProperty("/allBrand");
			if (brand === undefined) {
				var brand = this.byId("brand2").getModel("brandModel").getProperty("/allBrand");
			}

			this.globalSearch = false;

			if (this.selectedChannel !== "" && this.selectedChannel !== null && this.selectedChannel !== undefined && this.selectedCat !==
				undefined) {
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
					viewName = "";
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
					/*if (this.globalSearchField !== "" && this.globalSearchField !== undefined && this.globalSearchValue !== "" && this.globalSearchValue !==
						undefined) {
						var url = "pricing/PriceGrid.xsodata/" + viewName + "?$filter=WAREHOUSE_CODE__C eq '" +
							this.selectedWH + "' " + urlBrand + ") and (" + this.globalSearchField + ") &$skip=" + this.fetchSkip +
							"&$top=" + this.fetchTotal + "&$format=json";
					} */
					// /CPLResidentialBroadloomView.xsjs?Whcode=AND&accountNo=R.415888.0000&Brandcode=Retail&globalsearchKey=2R63&limit=100&from=1
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
						/*if (this.globalSearchField !== "" && this.globalSearchField !== undefined && this.globalSearchValue !== "" && this.globalSearchValue !==
							undefined) {
							var url = "pricing/PriceGrid.xsodata/" + viewName + "?$filter=ACCOUNT__C eq '" + this.accNo + "' or ACCOUNT__C eq '" +
								this.preAcc + "' and WAREHOUSE_CODE__C eq '" +
								this.selectedWH + "' " + urlBrand + ") and (" + this.globalSearchField + ") &$skip=" + this.fetchSkip +
								"&$top=" + this.fetchTotal + "&$format=json";
						} */
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
						/*if (this.globalSearchField !== "" && this.globalSearchField !== undefined && this.globalSearchValue !== "" && this.globalSearchValue !==
							undefined) {
							var url = "pricing/PriceGrid.xsodata/" + viewName + "?$filter=ACCOUNT__C eq '" + this.accNo +
								"' and WAREHOUSE_CODE__C eq '" +
								this.selectedWH + "' " + urlBrand + ") and (" + this.globalSearchField + ") &$skip=" + this.fetchSkip +
								"&$top=" + this.fetchTotal + "&$format=json";
						} */
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

							pViewModel.setData(data);
							var pViewData = data;
							for (var i = 0; i < pViewData.length; i++) {

								pViewData[i].SELLING_STYLE_CONCAT__C = pViewData[i].PRODUCT_NAME__C + "(" + pViewData[i].SELLING_STYLE_NUM__C + ")";
								// pViewData[i].NAME = pViewData[i].PRODUCT_NAME__C + "(" + pViewData[i].SELLING_STYLE_NUM__C + ")";
								pViewData[i].NAME = pViewData[i].PRODUCT_NAME__C; // modified because of change request by client
								pViewData[i].MASTER_STYLE_CONCAT__C = pViewData[i].MASTER_NAME__C + "(" + pViewData[i].MASTER_STYLE_NUM__C + ")";
								pViewData[i].INVENTORY_STYLE_CONCAT__C = pViewData[i].INVENTORY_STYLE_NAME__C + "(" + pViewData[i].INVENTORY_STYLE_NUM__C +
									")";
								pViewData[i].TM3_PRICE_CONCAT__C = pViewData[i].INVENTORY_STYLE_NAME__C + "(" + pViewData[i].INVENTORY_STYLE_NUM__C + ")";

								pViewData[i].INFORMATION = "";

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
								if (pViewData[i].BILLING_PRICE_ROLL__C !== pViewData[i].NET_PRICE_ROLL__C) {
									pViewData[i].INFORMATION += " $";
								}

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

								if (pViewData[i].BILLING_PRICE_ROLL__C) { // added condition for Buyers group fields - Pratik - 30/10
									if (pViewData[i].BUYING_GROUP_PRICE__C === "X" && pViewData[i].BUYING_GROUP_NUMBER__C !== null) {
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
										if (parseFloat(pViewData[i].BILLING_PRICE_ROLL__C) > parseFloat(pViewData[i].TM1_ROLL_PRICE__C)) {
											pViewData[i].PRICE_LEVEL_ROLL__C = "> TM1";
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

								if (pViewData[i].BILLING_PRICE_CUT__C) { // added condition for Buyers group fields - Pratik - 30/10
									if (pViewData[i].BUYING_GROUP_PRICE__C === "X" && pViewData[i].BUYING_GROUP_NUMBER__C !== null) {
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
										if (parseFloat(pViewData[i].BILLING_PRICE_CUT__C) > parseFloat(pViewData[i].TM1_CUT_PRICE__C)) {
											pViewData[i].PRICE_LEVEL_CUT__C = "> TM1";
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

								if (pViewData[i].BILLING_PRICE__C) { // added condition for Buyers group fields - Pratik - 30/10
									if (pViewData[i].BUYING_GROUP_PRICE__C === "X" && pViewData[i].BUYING_GROUP_NUMBER__C !== null) {
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
										if (parseFloat(pViewData[i].BILLING_PRICE__C) > parseFloat(pViewData[i].TM_PRICE__C)) {
											pViewData[i].PRICE_LEVEL__C = "> TM1";
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

								}

								// Edit Access
								var editCheck = false;
								for (var m = 0; m < that.productCode.length; m++) {
									for (var n = 0; n < that.brCode.length; n++) {
										if (pViewData[i].PRODUCT_TYPE__C === that.productCode[m].proCode && pViewData[i].BRAND_CODE__C === that.brCode[n].brand) {
											editCheck = true;
											break;
										}
									}
								}
								if (editCheck === true) {
									pViewData[i].EDITACCESS = "true";
								} else {
									pViewData[i].EDITACCESS = "false";
								}
								//

							}

							// sort by name
							pViewData.sort(function (a, b) {
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

							//var pViewData = pViewModel.getData();
							pViewModel.setData(pViewData);
							// that._bindFilters(pViewData, pViewModel);

							sap.ui.getCore().setModel(pViewModel, "pViewModel");
							that.getView().setModel(pViewModel, "pViewModel");

							that.bindRecords();
							that.getView().byId("sortButton").setEnabled(true);
							that.getView().byId("sortButton2").setEnabled(true);
						},
						error: function (error) {
							console.log(error);
							that.getView().byId("sortButton").setEnabled(false);
							that.getView().byId("sortButton2").setEnabled(false);
							//sap.m.MessageToast.show("Error");
							//return false;
						}
					});
				}

			}
		},

		bindRecords: function () {
			var pViewData = this.getView().getModel("pViewModel").getData();
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
			// oTable.setInfoToolbar(oOverFlow);		// Info toolbar can be added later. Not on current functionality // TO BE ADDED

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

			/*var oText1 = new sap.m.Text({
				text: "'I' Inherited price from parent list"
			});
			var oText2 = new sap.m.Text({
				text: "'G' Inherited price from group price"
			});
			var oText3 = new sap.m.Text({
				text: "'Q' Prices listed have a minimum quantity"
			});
			var oText4 = new sap.m.Text({
				text: "'C' Cut-at-roll length has a minimum quantity"
			});
			var oText5 = new sap.m.Text({
				text: "'$' Billing price does not match net price"
			});*/

			/*oFlex.insertItem(oText1);
			oFlex.insertItem(oText2);
			oFlex.insertItem(oText3);
			oFlex.insertItem(oText4);
			oFlex.insertItem(oText5);*/

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
							pViewData[i][dateFields[k].field] = dateFormat.format(new Date(parseInt(ms)));
						}
						//updated - Pratik//
						pViewData[i][dateFields[k].field] = (pViewData[i][dateFields[k].field] === "12/31/00") || (pViewData[i][dateFields[k].field] ===
							"12/30/00") ? "" : pViewData[i][dateFields[k].field];
					}
				}
			}

			var oCell = [];

			// for Menu buttons on left. 

			if (tHeader.length > 0) {

				var oMenuBtn = new sap.m.MenuButton({
					menu: new sap.m.Menu({
						items: [
							new sap.m.MenuItem({
								text: "Edit Current Price",
								icon: "sap-icon://edit",
								press: [this.onItemEdit, this]
							}),
							new sap.m.MenuItem({
								text: "Remove Current Price",
								icon: "sap-icon://delete",
								press: [this.onItemRemove, this]
							}),
						]
					}).addStyleClass("clsmenuitem"),

					visible: "{= ${pViewModel>EDITACCESS} === 'true'}"
				});

				oCell.push(oMenuBtn);
			}

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

			////////

			var oTable2 = this.getView().byId("list2");
			oTable2.removeAllItems();

			var listFilter = tHeader.filter(function (a) {
				return a.key == "1" || a.key == "2" || a.key == "3" || a.key == "4";
			});
			var lData = [];
			if (listFilter.length > 0) {
				for (var k = 0; k < pViewData.length; k++) {
					var f0 = listFilter[0].field.replace('PRODUCT__R.', '');
					var f1 = listFilter[1].field.replace('PRODUCT__R.', '');
					var f2 = listFilter[2].field.replace('PRODUCT__R.', '');
					var f3 = listFilter[3].field.replace('PRODUCT__R.', '');
					var data = {
						"intro": pViewData[k][f2],
						"title": pViewData[k][f1],
						"number": pViewData[k][f0],
						"numUnit": pViewData[k][f3]
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
			editPriceData[0].EditCartonPrice = editPriceData[0].BILLING_PRICE_ROLL__C;
			editPriceData[0].EditEachPrice = editPriceData[0].BILLING_PRICE_ROLL__C;

			var editModel = new JSONModel(editPriceData);
			this.getView().setModel(editModel, "editModel");

			if (!this._oDialogPGsurface) {
				this._oDialogPGsurface = sap.ui.xmlfragment("cf.cpl.fragments.EditCurrPrice", this);
				this.getView().addDependent(this._oDialogPGsurface);
			}
			this._oDialogPGsurface.setModel(editModel, "editModel");
			this._oDialogPGsurface.open();

			sap.ui.getCore().byId("sbsurfaceLevel").setSelectedItem("-1");

			var txtSFCurrPrice = sap.ui.getCore().byId("txtSFCurrPrice");
			var txtHFCurrPrice = sap.ui.getCore().byId("txtHFCurrPrice");
			var txtACCurrPrice = sap.ui.getCore().byId("txtACCurrPrice");
			var txtBGurrPrice = sap.ui.getCore().byId("txtBGurrPrice");

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

				if (editPriceData[0].BUYING_GROUP_PRICE__C === "X" && pViewData[i].BUYING_GROUP_NUMBER__C !== null) {
					sbBGLevel.setVisible(true);
					sbsurfaceLevel.setVisible(false);
					sbAccLevel.setVisible(false);
				} else {
					sbBGLevel.setVisible(false);
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

				if (editPriceData[0].BUYING_GROUP_PRICE__C === "X" && pViewData[i].BUYING_GROUP_NUMBER__C !== null) {
					sbBGLevel.setVisible(true);
				} else {
					sbsurfaceLevel.setVisible(true);
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

				if (editPriceData[0].BUYING_GROUP_PRICE__C === "X" && pViewData[i].BUYING_GROUP_NUMBER__C !== null) {
					sbBGLevel.setVisible(true);
				} else {
					sbsurfaceLevel.setVisible(true);
					sbAccLevel.setVisible(false);
				}

			}
		},

		OnCancelPGSurface: function () {
			this._oDialogPGsurface.close();
		},

		afterClosePGSurface: function () {
			if (this._oDialogPGsurface) {
				this._oDialogPGsurface.destroy();
				this._oDialogPGsurface = null;
			}
		},

		OnNext: function (oEvent) {
			var that = this;
			this._oDialogPGsurface.close();
			that.afterClosePGSurface();

			if (!this._oDialogJustification) {
				this._oDialogJustification = sap.ui.xmlfragment("cf.cpl.fragments.Justification", this);
				this.getView().addDependent(this._oDialogJustification);
			}

			this._oDialogJustification.open();
			var rdbReason = sap.ui.getCore().byId("rdbReason");
			rdbReason.setSelectedButton(false);
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
			rdbReason.setValueState("None");
			var txtPromocode = sap.ui.getCore().byId("txtPromocode");
			if (oEvent.getSource().getSelectedButton().getText() === "Promo Code") {
				txtPromocode.setVisible(true);
			} else {
				txtPromocode.setVisible(false);
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
				},
				error: function (error) {}
			});

			// open value help dialog filtered by the input value
			// this._valueHelpDialogPromocode.open(sInputPromocode);
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
		},

		onSurfaceBtnChange: function (oEvent) {
			var clickedBtn = oEvent.getParameters().item.getKey();
			var editPriceData = this.getView().getModel("editModel").getData();
			if (clickedBtn === "TM1") {
				editPriceData[0].EditRollPrice = typeof (editPriceData[0].TM1_ROLL_PRICE__C) === "string" ? editPriceData[0].TM1_ROLL_PRICE__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[0].TM1_ROLL_PRICE__C.split("$ ")[1]) : parseFloat(editPriceData[0].TM1_ROLL_PRICE__C) :
					editPriceData[0].TM1_ROLL_PRICE__C;
				editPriceData[0].EditCutPrice = typeof (editPriceData[0].TM1_CUT_PRICE__C) === "string" ? editPriceData[0].TM1_CUT_PRICE__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[0].TM1_CUT_PRICE__C.split("$ ")[1]) : parseFloat(editPriceData[0].TM1_CUT_PRICE__C) :
					editPriceData[0].TM1_CUT_PRICE__C;
			} else if (clickedBtn === "TM2") {
				editPriceData[0].EditRollPrice = typeof (editPriceData[0].TM2_ROLL_PRICE__C) === "string" ? editPriceData[0].TM2_ROLL_PRICE__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[0].TM2_ROLL_PRICE__C.split("$ ")[1]) : parseFloat(editPriceData[0].TM2_ROLL_PRICE__C) :
					editPriceData[0].TM2_ROLL_PRICE__C;
				editPriceData[0].EditCutPrice = typeof (editPriceData[0].TM2_CUT_PRICE__C) === "string" ? editPriceData[0].TM2_CUT_PRICE__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[0].TM2_CUT_PRICE__C.split("$ ")[1]) : parseFloat(editPriceData[0].TM2_CUT_PRICE__C) :
					editPriceData[0].TM2_CUT_PRICE__C;
			} else if (clickedBtn === "TM3") {
				editPriceData[0].EditRollPrice = typeof (editPriceData[0].TM3_ROLL_PRICE__C) === "string" ? editPriceData[0].TM3_ROLL_PRICE__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[0].TM3_ROLL_PRICE__C.split("$ ")[1]) : parseFloat(editPriceData[0].TM3_ROLL_PRICE__C) :
					editPriceData[0].TM3_ROLL_PRICE__C;
				editPriceData[0].EditCutPrice = typeof (editPriceData[0].TM3_CUT_PRICE__C) === "string" ? editPriceData[0].TM3_CUT_PRICE__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[0].TM3_CUT_PRICE__C.split("$ ")[1]) : parseFloat(editPriceData[0].TM3_CUT_PRICE__C) :
					editPriceData[0].TM3_CUT_PRICE__C;
			} else if (clickedBtn === "DM") {
				editPriceData[0].EditRollPrice = typeof (editPriceData[0].DM_ROLL_PRICE__C) === "string" ? editPriceData[0].DM_ROLL_PRICE__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[0].DM_ROLL_PRICE__C.split("$ ")[1]) : parseFloat(editPriceData[0].DM_ROLL_PRICE__C) :
					editPriceData[0].DM_ROLL_PRICE__C;
				editPriceData[0].EditCutPrice = typeof (editPriceData[0].DM_CUT_PRICE__C) === "string" ? editPriceData[0].DM_CUT_PRICE__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[0].DM_CUT_PRICE__C.split("$ ")[1]) : parseFloat(editPriceData[0].DM_CUT_PRICE__C) :
					editPriceData[0].DM_CUT_PRICE__C;
			} else if (clickedBtn === "RVP") {
				editPriceData[0].EditRollPrice = typeof (editPriceData[0].RVP_ROLL_PRICE__C) === "string" ? editPriceData[0].RVP_ROLL_PRICE__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[0].RVP_ROLL_PRICE__C.split("$ ")[1]) : parseFloat(editPriceData[0].RVP_ROLL_PRICE__C) :
					editPriceData[0].RVP_ROLL_PRICE__C;
				editPriceData[0].EditCutPrice = typeof (editPriceData[0].RVP_CUT_PRICE__C) === "string" ? editPriceData[0].RVP_CUT_PRICE__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[0].RVP_CUT_PRICE__C.split("$ ")[1]) : parseFloat(editPriceData[0].RVP_CUT_PRICE__C) :
					editPriceData[0].RVP_CUT_PRICE__C;
			}
			this.getView().getModel("editModel").setData(editPriceData);
		},

		onAccesBtnChange: function (oEvent) {
			var clickedBtn = oEvent.getParameters().item.getKey();
		},

		onBGBtnChange: function (oEvent) {
			var clickedBtn = oEvent.getParameters().item.getKey();
		},

		onSavePrice: function () {
			// var that = this;
			var txtPromocode = sap.ui.getCore().byId("txtPromocode");
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
					return;
				} else {
					txtPromocode.setValueState("None");
				}
			}

			if (txtComment.getValue() === "" || txtComment.getValue() === null) {
				lblcommenterrmsg.setVisible(true);
				txtComment.setValueState("Error");
				return;
			} else {
				lblcommenterrmsg.setVisible(false);
				txtComment.setValueState("None");
			}

			var editPriceData = this.getView().getModel("editModel").getData()[0];

			var updateUrl = "";
			var payload = ""
			var reqNetPriceCut = "";
			var reqNetPriceRoll = "";
			var justification = "";

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
			}

			var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});

			var startDate = "";
			var endDate = "";
			if (editPriceData.START_DATE__C !== "" || editPriceData.START_DATE__C !== null) {
				startDate = dateFormat.format(new Date(editPriceData.START_DATE__C));
			} else {
				startDate = "";
			}
			
			if (editPriceData.END_DATE__C !== "" || editPriceData.END_DATE__C !== null) {
				endDate = dateFormat.format(new Date(editPriceData.END_DATE__C));
			} else {
				endDate = "4000-12-31";
			}

			if (this.selectedCat === "Residential Broadloom" || this.selectedCat === "Commercial Broadloom" || this.selectedCat ===
				"Resilient Sheet") {
				updateUrl = "pricing/Updatecplhardsurface.xsjs";
				var cplRecordId = new Date().getTime().toString();
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
					"Modifiedby": this.loggedInUser,
					"Reqbillpricecut": editPriceData.EditCutPrice.toString(),
					"Reqbillpriceroll": editPriceData.EditRollPrice.toString(),
					"Reqnetpricecut": reqNetPriceCut.toString(),
					"Reqnetpriceroll": reqNetPriceRoll.toString(),
				};
			} else if (this.selectedCat === "Carpet Tile" || this.selectedCat === "Tile" || this.selectedCat === "TecWood" || this.selectedCat ===
				"SolidWood" || this.selectedCat === "RevWood" || this.selectedCat === "Resilient Tile") {
				updateUrl = "pricing/Updatecplsoftsurface.xsjs";
				payload = {
					"Accountno": this.accNo,
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
					"Modifiedby": this.loggedInUser,
					"Reqbillpricecarton": editPriceData.EditCutPrice.toString(),
					"Reqbillpricepallet": editPriceData.EditRollPrice.toString(),
					"Reqnetpricecarton": reqNetPriceCut.toString(),
					"Reqnetpricepallet": reqNetPriceRoll.toString(),
				};
			} else if (this.selectedCat === "Accessories") {
				updateUrl = "pricing/Updatecplaccessories.xsjs";
				payload = {
					"Accountno": this.accNo,
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
					"Modifiedby": this.loggedInUser,
					"Reqbillprice": 0,
					"Reqnetprice": 0,
				};
			}
			var that = this;
			$.ajax({
				url: updateUrl,
				contentType: "application/json",
				method: "POST",
				async: false,
				data: JSON.stringify(payload),
				success: function (response) {
					console.log(response);
					that.OnCancelJustification();
				},
				error: function (error) {}
			});

		},

		/*	_bindFilters: function (pViewData, pViewModel) {
				var brands = [{
						"key": 0,
						"brand": ""
					}],
					fibers = [{
						"key": 0,
						"fiber": ""
					}],
					fiberBrands = [{
						"key": 0,
						"fiberBrand": ""
					}],
					constructions = [{
						"key": 0,
						"construction": ""
					}],
					weights = [{
						"key": 0,
						"weight": ""
					}],
					collections = [{
						"key": 0,
						"collection": ""
					}],
					displayVehicles = [{
						"key": 0,
						"vehicle": ""
					}],
					categories = [{
						"key": 0,
						"category": ""
					}],
					density = [{
						"key": 0,
						"density": ""
					}],
					gauge = [{
						"key": 0,
						"gauge": ""
					}],
					size = [{
						"key": 0,
						"size": ""
					}],
					antimicrobial = [{
						"key": 0,
						"antimicrobial": ""
					}],
					moistureBarriers = [{
						"key": 0,
						"moBarrier": ""
					}],
					localStock = [{
						"key": 0,
						"stock": ""
					}],
					segments = [{
						"key": 0,
						"segment": ""
					}],
					widths = [{
						"key": 0,
						"width": ""
					}],
					species = [{
						"key": 0,
						"Species": ""
					}],
					textures = [{
						"key": 0,
						"texture": ""
					}],
					features = [{
						"key": 0,
						"feature": ""
					}],
					cores = [{
						"key": 0,
						"core": ""
					}],
					wearLayer = [{
						"key": 0,
						"layer": ""
					}],
					installation = [{
						"key": 0,
						"installation": ""
					}],
					backing = [{
						"key": 0,
						"backing": ""
					}],
					descriptions = [{
						"key": 0,
						"desc": ""
					}],
					application = [{
						"key": 0,
						"app": ""
					}],
					technology = [{
						"key": 0,
						"tech": ""
					}],
					thickness = [{
						"key": 0,
						"thick": ""
					}];

				for (var j = 0; j < pViewData.length; j++) {
					//Brand	
					if (pViewData[j].BRAND_CODE__C) {
						var tempBrand = {
							"key": j + 1,
							"brand": pViewData[j].BRAND_CODE__C
						};
						var brandAdded = false;
						for (var s = 0; s < brands.length; s++) {
							if (brands[s].brand === tempBrand.brand) {
								brandAdded = true;
							}
						}
						if (brandAdded === false) {
							brands.push(tempBrand);
						}
					}

					//Fiber
					if (pViewData[j].FIBER_TYPE__C) {
						var tempFiber = {
							"key": j + 1,
							"fiber": pViewData[j].FIBER_TYPE__C
						};
						var fiberAdded = false;
						for (var s = 0; s < fibers.length; s++) {
							if (fibers[s].fiber === tempFiber.fiber) {
								fiberAdded = true;
							}
						}
						if (fiberAdded === false) {
							fibers.push(tempFiber);
						}
					}

					//FiberBrand
					if (pViewData[j].FIBER_BRAND_CODE__C) {
						var tempFiberBrand = {
							"key": j + 1,
							"fiberBrand": pViewData[j].FIBER_BRAND_CODE__C
						};
						var fiberBrandAdded = false;
						for (var s = 0; s < fiberBrands.length; s++) {
							if (fiberBrands[s].fiberBrand === tempFiberBrand.fiberBrand) {
								fiberBrandAdded = true;
							}
						}
						if (fiberBrandAdded === false) {
							fiberBrands.push(tempFiberBrand);
						}
					}

					//Construction
					if (pViewData[j].FINISH__C) {
						var tempConstruction = {
							"key": j + 1,
							"construction": pViewData[j].FINISH__C
						};
						var constructionAdded = false;
						for (var s = 0; s < constructions.length; s++) {
							if (constructions[s].construction === tempConstruction.construction) {
								constructionAdded = true;
							}
						}
						if (constructionAdded === false) {
							constructions.push(tempConstruction);
						}
					}

					//Weight
					if (pViewData[j].FACE_WEIGH__C) {
						var tempWeight = {
							"key": j + 1,
							"weight": pViewData[j].FACE_WEIGH__C
						};
						var weightAdded = false;
						for (var s = 0; s < weights.length; s++) {
							if (weights[s].weight === tempWeight.weight) {
								weightAdded = true;
							}
						}
						if (weightAdded === false) {
							weights.push(tempWeight);
						}
					}

					//Collection
					if (pViewData[j].FACE_WEIGH__C) {
						var tempCollection = {
							"key": j + 1,
							"collection": pViewData[j].FACE_WEIGH__C // Check Value
						};
						var collectionAdded = false;
						for (var s = 0; s < collections.length; s++) {
							if (collections[s].collection === tempCollection.collection) {
								collectionAdded = true;
							}
						}
						if (collectionAdded === false) {
							collections.push(tempCollection);
						}
					}

					//Display Vehicle
					if (pViewData[j].DISPLAY__C) {
						var tempVehicle = {
							"key": j + 1,
							"vehicle": pViewData[j].DISPLAY__C
						};
						var vehicleAdded = false;
						for (var s = 0; s < displayVehicles.length; s++) {
							if (displayVehicles[s].vehicle === tempVehicle.vehicle) {
								vehicleAdded = true;
							}
						}
						if (vehicleAdded === false) {
							displayVehicles.push(tempVehicle);
						}
					}

					//Category
					if (pViewData[j].SUB_CATEGORY__C) {
						var tempCategory = {
							"key": j + 1,
							"category": pViewData[j].SUB_CATEGORY__C
						};
						var categoryAdded = false;
						for (var s = 0; s < categories.length; s++) {
							if (categories[s].category === tempCategory.category) {
								categoryAdded = true;
							}
						}
						if (categoryAdded === false) {
							categories.push(tempCategory);
						}
					}

					//Density
					if (pViewData[j].RESIDENTIAL_DENSITY__C) {
						var tempDensity = {
							"key": j + 1,
							"density": pViewData[j].RESIDENTIAL_DENSITY__C
						};
						var densityAdded = false;
						for (var s = 0; s < density.length; s++) {
							if (density[s].density === tempDensity.density) {
								densityAdded = true;
							}
						}
						if (densityAdded === false) {
							density.push(tempDensity);
						}
					}

					//Gauge
					if (pViewData[j].SIZE__C) {
						var tempGauge = {
							"key": j + 1,
							"gauge": pViewData[j].SIZE__C // Check Value
						};
						var gaugeAdded = false;
						for (var s = 0; s < gauge.length; s++) {
							if (gauge[s].gauge === tempGauge.gauge) {
								gaugeAdded = true;
							}
						}
						if (gaugeAdded === false) {
							gauge.push(tempGauge);
						}
					}

					//Size
					if (pViewData[j].SIZE__C) {
						var tempSize = {
							"key": j + 1,
							"size": pViewData[j].SIZE__C
						};
						var sizeAdded = false;
						for (var s = 0; s < size.length; s++) {
							if (size[s].size === tempSize.size) {
								sizeAdded = true;
							}
						}
						if (sizeAdded === false) {
							size.push(tempSize);
						}
					}

					//Antimicrobial
					if (pViewData[j].ANTIMICROBIAL__C) {
						var tempAntimicrobial = {
							"key": j + 1,
							"antimicrobial": pViewData[j].ANTIMICROBIAL__C
						};
						var antimicrobialAdded = false;
						for (var s = 0; s < antimicrobial.length; s++) {
							if (antimicrobial[s].antimicrobial === tempAntimicrobial.antimicrobial) {
								antimicrobialAdded = true;
							}
						}
						if (antimicrobialAdded === false) {
							antimicrobial.push(tempAntimicrobial);
						}
					}

					//Moisture Barriers
					if (pViewData[j].MOISTURE_BARRIER__C) {
						var tempMoBarrier = {
							"key": j + 1,
							"moBarrier": pViewData[j].MOISTURE_BARRIER__C
						};
						var moBarrierAdded = false;
						for (var s = 0; s < moistureBarriers.length; s++) {
							if (moistureBarriers[s].moBarrier === tempMoBarrier.moBarrier) {
								moBarrierAdded = true;
							}
						}
						if (moBarrierAdded === false) {
							moistureBarriers.push(tempMoBarrier);
						}
					}

					//Local Stock
					if (pViewData[j].LOCAL_STOCK__C) {
						var tempLocalStock = {
							"key": j + 1,
							"stock": pViewData[j].LOCAL_STOCK__C
						};
						var localStockAdded = false;
						for (var s = 0; s < localStock.length; s++) {
							if (localStock[s].stock === tempLocalStock.stock) {
								localStockAdded = true;
							}
						}
						if (localStockAdded === false) {
							localStock.push(tempLocalStock);
						}
					}

					//Segments
					if (pViewData[j].SEGMENT__C) {
						var tempSegment = {
							"key": j + 1,
							"segment": pViewData[j].SEGMENT__C
						};
						var segmentAdded = false;
						for (var s = 0; s < segments.length; s++) {
							if (segments[s].segment === tempSegment.segment) {
								segmentAdded = true;
							}
						}
						if (segmentAdded === false) {
							segments.push(tempSegment);
						}
					}

					//Width
					if (pViewData[j].SIZE_DESCRIPTION__C) {
						var tempWidth = {
							"key": j + 1,
							"width": pViewData[j].SIZE_DESCRIPTION__C //Check Value
						};
						var widthAdded = false;
						for (var s = 0; s < widths.length; s++) {
							if (widths[s].width === tempWidth.width) {
								widthAdded = true;
							}
						}
						if (widthAdded === false) {
							widths.push(tempWidth);
						}
					}

					//Species
					if (pViewData[j].SPECIES__C) {
						var tempSpecie = {
							"key": j + 1,
							"Species": pViewData[j].SPECIES__C
						};
						var speciesAdded = false;
						for (var s = 0; s < species.length; s++) {
							if (species[s].Species === tempSpecie.Species) {
								speciesAdded = true;
							}
						}
						if (speciesAdded === false) {
							species.push(tempSpecie);
						}
					}

					//Textures
					if (pViewData[j].TEXTURE__C) {
						var tempTexture = {
							"key": j + 1,
							"texture": pViewData[j].TEXTURE__C
						};
						var textureAdded = false;
						for (var s = 0; s < textures.length; s++) {
							if (textures[s].texture === tempTexture.texture) {
								textureAdded = true;
							}
						}
						if (textureAdded === false) {
							textures.push(tempTexture);
						}
					}

					//Feature
					if (pViewData[j].FEATURES__C) {
						var tempFeatures = {
							"key": j + 1,
							"feature": pViewData[j].FEATURES__C
						};
						var featureAdded = false;
						for (var s = 0; s < features.length; s++) {
							if (features[s].feature === tempFeatures.feature) {
								featureAdded = true;
							}
						}
						if (featureAdded === false) {
							features.push(tempFeatures);
						}
					}

					//Core
					if (pViewData[j].CORE_BODY__C) {
						var tempCores = {
							"key": j + 1,
							"core": pViewData[j].CORE_BODY__C
						};
						var coreAdded = false;
						for (var s = 0; s < cores.length; s++) {
							if (cores[s].core === tempCores.core) {
								coreAdded = true;
							}
						}
						if (coreAdded === false) {
							cores.push(tempCores);
						}
					}

					//Wear Layer
					if (pViewData[j].WEAR_LAYER__C) {
						var tempWearLayer = {
							"key": j + 1,
							"layer": pViewData[j].WEAR_LAYER__C
						};
						var layerAdded = false;
						for (var s = 0; s < wearLayer.length; s++) {
							if (wearLayer[s].layer === tempWearLayer.layer) {
								layerAdded = true;
							}
						}
						if (layerAdded === false) {
							wearLayer.push(tempWearLayer);
						}
					}

					//Installation
					if (pViewData[j].INSTALLATION_METHOD__C) {
						var tempInstallation = {
							"key": j + 1,
							"installation": pViewData[j].INSTALLATION_METHOD__C
						};
						var installationAdded = false;
						for (var s = 0; s < installation.length; s++) {
							if (installation[s].installation === tempInstallation.installation) {
								installationAdded = true;
							}
						}
						if (installationAdded === false) {
							installation.push(tempInstallation);
						}
					}

					//Backing
					if (pViewData[j].BACKING__C) {
						var tempBacking = {
							"key": j + 1,
							"backing": pViewData[j].BACKING__C
						};
						var backingAdded = false;
						for (var s = 0; s < backing.length; s++) {
							if (backing[s].backing === tempBacking.backing) {
								backingAdded = true;
							}
						}
						if (backingAdded === false) {
							backing.push(tempBacking);
						}
					}

					//Description
					if (pViewData[j].BACKING_DESCRIPTION__C) {
						var tempDesc = {
							"key": j + 1,
							"desc": pViewData[j].BACKING_DESCRIPTION__C
						};
						var descAdded = false;
						for (var s = 0; s < descriptions.length; s++) {
							if (descriptions[s].desc === tempDesc.desc) {
								descAdded = true;
							}
						}
						if (descAdded === false) {
							descriptions.push(tempDesc);
						}
					}

					//Application
					if (pViewData[j].BACKING_DESCRIPTION__C) {
						var tempApp = {
							"key": j + 1,
							"app": pViewData[j].BACKING_DESCRIPTION__C // check value
						};
						var appAdded = false;
						for (var s = 0; s < application.length; s++) {
							if (application[s].app === tempApp.app) {
								appAdded = true;
							}
						}
						if (appAdded === false) {
							application.push(tempApp);
						}
					}

					//Technology
					if (pViewData[j].TECHNOLOGY_APPLICATION__C) {
						var tempTech = {
							"key": j + 1,
							"tech": pViewData[j].TECHNOLOGY_APPLICATION__C
						};
						var techAdded = false;
						for (var s = 0; s < technology.length; s++) {
							if (technology[s].tech === tempTech.tech) {
								techAdded = true;
							}
						}
						if (techAdded === false) {
							technology.push(tempTech);
						}
					}

					//Thickness
					if (pViewData[j].THICKNESS__C) {
						var tempThick = {
							"key": j + 1,
							"thick": pViewData[j].THICKNESS__C
						};
						var thickAdded = false;
						for (var s = 0; s < thickness.length; s++) {
							if (thickness[s].thick === tempThick.thick) {
								thickAdded = true;
							}
						}
						if (thickAdded === false) {
							thickness.push(tempThick);
						}
					}
				}

				pViewModel.setProperty("/brands", brands);
				pViewModel.setProperty("/fibers", fibers);
				pViewModel.setProperty("/fiberBrands", fiberBrands);
				pViewModel.setProperty("/constructions", constructions);
				pViewModel.setProperty("/weights", weights);
				pViewModel.setProperty("/collections", collections);
				pViewModel.setProperty("/displayVehicles", displayVehicles);
				pViewModel.setProperty("/categories", categories);
				pViewModel.setProperty("/density", density);
				pViewModel.setProperty("/gauge", gauge);
				pViewModel.setProperty("/size", size);
				pViewModel.setProperty("/antimicrobial", antimicrobial);
				pViewModel.setProperty("/moistureBarriers", moistureBarriers);
				pViewModel.setProperty("/localStock", localStock);
				pViewModel.setProperty("/segments", segments);
				pViewModel.setProperty("/widths", widths);
				pViewModel.setProperty("/species", species);
				pViewModel.setProperty("/textures", textures);
				pViewModel.setProperty("/features", features);
				pViewModel.setProperty("/cores", cores);
				pViewModel.setProperty("/wearLayer", wearLayer);
				pViewModel.setProperty("/installation", installation);
				pViewModel.setProperty("/backing", backing);
				pViewModel.setProperty("/descriptions", descriptions);
				pViewModel.setProperty("/application", application);
				pViewModel.setProperty("/technology", technology);
				pViewModel.setProperty("/thickness", thickness);

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
			var oModel = new JSONModel(this.warehouses);
			this.byId("wh").setModel(oModel, "warehouses");
			this.byId("wh2").setModel(oModel, "warehouses");
			var localData = this.proCat;
			var lModel = new JSONModel(localData);
			this.getView().setModel(lModel, "local");
			this.getView().byId("prodCat").setModel(lModel, "local");
			this.getView().byId("prodCat2").setModel(lModel, "local");
			// var scData = this.getView().getModel("brandModel").getProperty("/allChannel");
			// var oModel = new JSONModel(scData);
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

		fetchColNProd: function () {

		},
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

			// this.globalCols = this.gridmeta.filter((a) => (a.PRIMARY_DISPLAY_ORDER__C == "1") && (a.IS_PRIMARY_DISPLAY__C == "X")).sort(this.sortGridMeta);

			/*this.globalCols = this.gridmeta.filter((a) => (a.FIELD_LABEL__C == "Mstr #" || a.FIELD_LABEL__C ==
									"Master Style" || a.FIELD_LABEL__C == "Sell #" || a.FIELD_LABEL__C == "Selling Style" || a.FIELD_LABEL__C == "Brand") && (a.IS_PRIMARY_DISPLAY__C ==
									"X")).sort(this.sortGridMeta);
			
								var filters = [];
								for (var i = 0; i < this.globalCols.length; i++) {
									var tempF = {
										"key": i + 1,
										"field": this.globalCols[i].FIELD_API_NAME__C.toUpperCase()
									};
									var fAdded = "false";
									for (var j = 0; j < filters.length; j++) {
										if (filters[j].field === tempF.field) {
											fAdded = "true";
										}
									}
									if (fAdded === "false") {
										filters.push(tempF);
									}
								}

								for (var k = 0; k < filters.length; k++) {
									if (filters[k].field === 'PRODUCT__R.NAME') {
										filters[k].field = 'PRODUCT__R.PRODUCT_NAME__C';
									}
								}

								var header = sap.ui.getCore().getModel("configModel").getProperty("/mHeader");
								for (var j = 0; j < filters.length; j++) {
									filters[j].field = filters[j].field.includes("PRODUCT__R.") ? filters[j].field.replace("PRODUCT__R.", "") : filters[j].field;
								}*/

			var that = this;
			var pViewModel = new JSONModel();
			var sQuery = oEvent.getParameter("query");
			sQuery = sQuery.toUpperCase();

			this.globalSearchValue = sQuery;
			var oTable = this.getView().byId("list");
			var oTable2 = this.getView().byId("list2");

			/*var urlFilter = "";
			for (var i = 0; i < filters.length; i++) {
				if (i === 0) {
					urlFilter = urlFilter + filters[i].field.toUpperCase() + " eq '" + sQuery + "'";
				} else {
					urlFilter = urlFilter + " or " + filters[i].field.toUpperCase() + " eq '" + sQuery + "'";
				}
			}*/

			/*var urlFilter = "PRODUCT_STYLE_NUMBER_UPPER__C eq '" + sQuery + "' or PRODUCT_NAME_UPPER__C eq '" + sQuery +
				"' or MASTER_STYLE_NAME_UPPER__C eq '" + sQuery + "' or MASTER_STYLE_NUM_UPPER__C eq '" + sQuery + "' or BRAND_CODE_UPPER__C eq '" +
				sQuery + "'";
				
			this.globalSearchField = urlFilter;

			var viewName = "";

			if (this.selectedCat === "Commercial Broadloom") {
				viewName = "CPLCommercialBroadloomView";
			} else if (this.selectedCat === "Accessories") {
				viewName = "CPLAccessoriesView";
			} else if (this.selectedCat === "Carpet Tile") {
				viewName = "CPLCarpetTileView";
			} else if (this.selectedCat === "Cushion") {
				viewName = "";
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
			} else {
				MessageBox.error("Please select valid product category and try again");
			}
			var url = "pricing/PriceGrid.xsodata/" + viewName + "?$filter=" + urlFilter + "&$format=json"; */
			if (this.accNo !== "" && this.accNo !== undefined) {
				var url = "pricing/GBSCPLview.xsjs?globalsearchKey=" + sQuery + "&Productcategory=" + this.selectedCat + "&accountNo1=" + this.accNo +
					"&accountNo2=NA&$format=json";
			} else {
				var url = "pricing/GBSCPLview.xsjs?globalsearchKey=" + sQuery + "&Productcategory=" + this.selectedCat +
					"&accountNo1=NA&accountNo2=NA&$format=json";
			}
			if (sQuery && sQuery.length > 0) {
				$.ajax({
					url: url,
					contentType: "application/json",
					type: 'GET',
					dataType: "json",
					async: false,
					success: function (response) {

						/*pViewModel.setData(response.d.results);
						var pViewData = response.d.results;*/
						pViewModel.setData(response.results);
						var pViewData = response.results;
						for (var i = 0; i < pViewData.length; i++) {
							pViewData[i].SELLING_STYLE_CONCAT__C = pViewData[i].PRODUCT_NAME__C + "(" + pViewData[i].SELLING_STYLE_NUM__C + ")";
							// pViewData[i].NAME = pViewData[i].PRODUCT_NAME__C + "(" + pViewData[i].SELLING_STYLE_NUM__C + ")";
							pViewData[i].NAME = pViewData[i].PRODUCT_NAME__C;
							pViewData[i].MASTER_STYLE_CONCAT__C = pViewData[i].MASTER_NAME__C + "(" + pViewData[i].MASTER_STYLE_NUM__C + ")";
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

						/*var proCatData = [{
							"key": 0,
							"name": ""
						}];*/

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

							/*var tempProCat = {
								"key": j + 1,
								"name": pViewData[j].SALESFORCE_PRODUCT_CATEGORY__C
							};
							var proCatAdded = false;
							for (var s = 0; s < proCatData.length; s++) {
								if (pViewData[j].SALESFORCE_PRODUCT_CATEGORY__C === proCatData[s].name) {
									proCatAdded = true;
								}
							}
							if (proCatAdded === false) {
								proCatData.push(tempProCat);
							}*/

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
						// that.getView().getModel("warehouses").refresh();

						/*var proCategory = {
							"ProductCategory": proCatData
						};
						var catModel = new JSONModel(proCategory);
						that.getView().setModel(catModel, "local");
						that.getView().byId("prodCat").setModel(catModel, "local");
						that.getView().byId("prodCat2").setModel(catModel, "local");
						that.getView().byId("prodCat").setSelectedKey(0);
						that.getView().byId("prodCat2").setSelectedKey(0);*/

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

						// var oModel = new JSONModel(temSales);
						that.getView().getModel("brandModel").setProperty("/allChannel", temSales);
						that.getView().byId("brand").setSelectedKey(0);
						that.getView().byId("brand2").setSelectedKey(0);

						// that.selectedCat = "";
						that.selectedWH = "";
						that.selectedChannel = "";

						oTable.removeAllItems();
						oTable.removeAllColumns();

						oTable2.removeAllItems();

						// that.bindRecords();
					},
					error: function (error) {
						console.log(error);
						//sap.m.MessageToast.show("Error");
						//return false;
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

				// update list binding
				var oList = this.byId("list");
				var oBinding = oList.getBinding("items");
				oBinding.filter(oFilter, "Application");
				// update list binding
				var oList2 = this.byId("list2");
				var oBinding2 = oList2.getBinding("items");
				oBinding2.filter(oFilter, "Application");
			} else {
				this.bindRecords();

				/*	var oModel = new JSONModel(this.masterData);
					this.byId("list").setModel(oModel, "MasterModel");
					this.getModel("MasterModel").refresh();*/
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

			// update filter state:
			// combine the filter array and the filter string

			/*this._oListFilterState.aFilter = aFilters;
			this._updateFilterBar(aCaptions.join(", "));
			this._applyFilterSearch();*/
			// this._applySortGroup(oEvent);
		},

		/**
		 * Apply the chosen sorter and grouper to the master list
		 * @param {sap.ui.base.Event} oEvent the confirm event
		 * @private
		 */

		/*applySortGroup: function (oEvent) {
					var mParams = oEvent.getParameters(),
						sPath,
						bDescending,
						aSorters = [];
					// apply sorter to binding
					// (grouping comes before sorting)
					if (mParams.groupItem) {
						sPath = mParams.groupItem.getKey();
						bDescending = mParams.groupDescending;
						// var vGroup = this._oGroupFunctions[sPath];
						// aSorters.push(new Sorter(sPath, bDescending, vGroup));
					}
					sPath = mParams.sortItem.getKey();
					bDescending = mParams.sortDescending;
					aSorters.push(new Sorter(sPath, bDescending));
					this._oList.getBinding("items").sort(aSorters);
				},*/

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
						objectId: oItem.getIntro()
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
						objectId: oItem.getIntro()
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
			/*if (this._oList.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("masterTitleCount", [iTotalItems]);
				this.getModel("masterView").setProperty("/title", sTitle);
			}*/
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @private
		 */
		/*_applyFilterSearch: function () {
			var aFilters = this._oListFilterState.aSearch.concat(this._oListFilterState.aFilter),
				oViewModel = this.getModel("masterView");
			this._oList.getBinding("items").filter(aFilters, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aFilters.length !== 0) {
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataWithFilterOrSearchText"));
			} else if (this._oListFilterState.aSearch.length > 0) {
				// only reset the no data text to default when no new search was triggered
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataText"));
			}
		},*/

		/**
		 * Internal helper method that sets the filter bar visibility property and the label's caption to be shown
		 * @param {string} sFilterBarText the selected filter value
		 * @private
		 */
		/*_updateFilterBar: function (sFilterBarText) {
			var oViewModel = this.getModel("masterView");
			oViewModel.setProperty("/isFilterBarVisible", (this._oListFilterState.aFilter.length > 0));
			oViewModel.setProperty("/filterBarLabel", this.getResourceBundle().getText("masterFilterBarText", [sFilterBarText]));
		},*/
		sortGridMeta: function (objA, objB) {
			if (objA['PRIMARY_DISPLAY_ORDER__C'] === undefined || objB['PRIMARY_DISPLAY_ORDER__C'] === undefined) return 1;
			let objectA = objA['PRIMARY_DISPLAY_ORDER__C'];
			let objectB = objB['PRIMARY_DISPLAY_ORDER__C'];
			if (objectA == undefined || objectB == undefined) return 0;
			else return objectA - objectB;
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
		}
	});

});