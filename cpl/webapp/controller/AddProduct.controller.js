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

	return BaseController.extend("cf.cpl.controller.AddProduct", {

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

			this.getRouter().getRoute("addProduct").attachPatternMatched(this._onMasterMatched, this);
			this.getRouter().attachBypassed(this.onBypassed, this);

			var lModel = new JSONModel(this.productCategory());
			this.getView().setModel(lModel, "local");
			// this.getView().byId("apProdCat").setModel(lModel, "local");
			 var that = this;
			
				that.EditAcessmeta = sap.ui.getCore().getModel("configModel").getProperty("/EditAccessmeta");
		},

		onAfterRendering: function () {
				this.bindAPRecords();


			// this.getView().byId("apWH").setModel(sap.ui.getCore().getModel("configModel"), "warehouses");
			// this.getView().byId("apBrand").setModel(sap.ui.getCore().getModel("configModel"), "brandModel");

		},

		_onMasterMatched: function (oEvent) {
			/*var width = this.getView()._oContextualSettings.contextualWidth;
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
			}*/
			// this.concatDataFlag = true;
			sap.ui.getCore().getModel("configModel").setProperty("/concatDataFlag", true);
			this.selectedCat = sap.ui.getCore().getModel("configModel").getProperty("/selectedCat");
			// Start by <JAYANT PRAKASH> for <5081>
			if (this.selectedCat === "Resilient Tile & Plank" ) 
			{
				sap.ui.getCore().getModel("configModel").setProperty("/selectedCat", "Resilient Tile");
				this.selectedCat = sap.ui.getCore().getModel("configModel").getProperty("/selectedCat");
			} //End by <JAYANT PRAKASH> for <5081>
			if (this.selectedCat === "Resilient Tile") {
				sap.ui.getCore().getModel("configModel").setProperty("/selectedCat", "Resilient Tile & Plank");
			}
			this.selectedWH = sap.ui.getCore().getModel("configModel").getProperty("/selectedWH");
			this.selectedChannel = sap.ui.getCore().getModel("configModel").getProperty("/selectedChannel");
			this.loggedInUser = sap.ui.getCore().getModel("configModel").getProperty("/loggedInUser");

			this.getView().setModel(sap.ui.getCore().getModel("configModel"), "addProductModel");

			var searchParam = document.location.href.split("?");
			if (searchParam.length > 1) {
				if (searchParam[1].split("#").length > 0) {
					var newSearch = searchParam[1].split("#");
					var accNo = "";
					accNo = newSearch[0].split("=")[1];
					accNo = accNo.includes("#") ? accNo.replace("#", '') : accNo;
					this.accNo = accNo;
				}
			}
			this.fetchAddProducts();
		},

		onBypassed: function () {},

		fetchAddProducts: function () {
			// console.log("Fetch Add Product");
			var brand = sap.ui.getCore().getModel("configModel").getProperty("/allBrand");
			this.brCode = sap.ui.getCore().getModel("configModel").getProperty("/brCode");

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
				var apViewModel = new JSONModel();
				this.getView().setModel(apViewModel, "apViewModel");

				var viewName = "CPLAddProductView";

				var url = "pricing/" + viewName + ".xsjs";

				if (this.accNo === "" || this.accNo === undefined) {
					var payload = {
						"Accountno": "",
						"Productcategory": this.selectedCat,
						"Whcode": this.selectedWH,
						"SalesChannel": this.selectedChannel
					};
				} else {
					var payload = {
						"Accountno": this.accNo,
						"Productcategory": this.selectedCat,
						"Whcode": this.selectedWH,
						"SalesChannel": this.selectedChannel
					};
				}

				if (this.selectedWH !== undefined & this.selectedWH !== "" & this.selectedChannel !== undefined & this.selectedChannel !== "" &
					this.selectedCat !== undefined & this.selectedCat !== "") {
					//https://mohawk-carpet--llc-zepl-zepl-pricing.cfapps.eu10.hana.ondemand.com/CPLAddProductView.xsjs
					$.ajax({
						url: url,
						contentType: "application/json",
						type: 'POST',
						dataType: "json",
						async: false,
						data: JSON.stringify(payload),
						success: function (response) {
							var data = response.results;
							console.log(data);
							
							var editableData = [];
							if (that.brCode && that.brCode.length > 0) {
								var g = that;
								editableData = data.filter(function (a) {
									for (var n = 0; n < g.brCode.length; n++) {
										if (a.ERP_PRODUCT_TYPE__C === g.brCode[n].proCode && a.BRAND_CODE__C === g.brCode[n].brand) {
											return a;
										}
									}
								});
							}
							for (var i = 0; i < editableData.length; i++) {
								editableData[i].NAME = editableData[i].PRODUCT_NAME__C;
							}

							that.SortByName(editableData);

							apViewModel.setData(editableData);
							sap.ui.getCore().setModel(apViewModel, "apViewModel");
							that.getView().setModel(apViewModel, "apViewModel");
							that.bindAPRecords();
						},
						error: function (error) {
							console.log(error);
						}
					});
				}
			}
		},

		bindAPRecords: function () {
			var pViewData = this.getView().getModel("apViewModel").getData();
			var oTable = this.getView().byId("productList");
			oTable.removeAllItems();
			oTable.removeAllColumns();

			var tHeader = [];
			this.gridmeta = sap.ui.getCore().getModel("configModel").getData();
			this.addPrimaryCols = this.gridmeta.filter((a) => (a['PRODUCT_CATEGORY__C'] == this.selectedCat && a.IS_ADD_PRODUCT__C == "X")).sort(
				this.sortGridMeta);

			for (var i = 0; i < this.addPrimaryCols.length; i++) {
				var oColumn = new sap.m.Column({
					header: new sap.m.Label({
						text: this.addPrimaryCols[i]['SHORT_LABEL__C']
					})
				});
				oTable.addColumn(oColumn);
				var tData = {
					"key": this.addPrimaryCols[i].ADD_PRODUCT_SORT_ORDER__C,
					"header": this.addPrimaryCols[i].SHORT_LABEL__C,
					"field": this.addPrimaryCols[i].FIELD_API_NAME__C.toUpperCase(),
					"type": this.addPrimaryCols[i].DATA_TYPE__C
				};
				tHeader.push(tData);
			}

			sap.ui.getCore().getModel("configModel").setProperty("/apHeader", tHeader);

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
							var dateNew = new Date(parseInt(ms));
							var year = dateNew.getFullYear();
							pViewData[i][dateFields[k].field] = year >= 4000 ? "" : dateFormat.format(dateNew);
						}
						if (date.split("-").length > 1) {
							pViewData[i][dateFields[k].field] = dateFormat.format(new Date(date));
						}
					}
				}
			}

			var oCell = [];

			for (var j = 0; j < tHeader.length; j++) {
				if (tHeader[j].type === "Currency") {
					var cell1 = new sap.m.Text({
						text: "$ " + "{apViewModel>" + tHeader[j].field.replace('PRODUCT__R.', '') + "}"
					});
					oCell.push(cell1);
				} else {
					var cell1 = new sap.m.Text({
						text: "{apViewModel>" + tHeader[j].field.replace('PRODUCT__R.', '') + "}"
					});
					oCell.push(cell1);
				}
			}

			var aColList = new sap.m.ColumnListItem({
				cells: oCell
					//	type: "Navigation",
					//	press: [this.onSelectionChange, this]
			});
			oTable.bindItems("apViewModel>/", aColList);
			//Added by diksha for lock pricing //
				var header = oTable.$().find('thead');
				var that = this;
			oTable.getItems().forEach(function (r) {
			
				var obj = r.getBindingContext("apViewModel").getObject();
				var oStatus = obj.APPROVAL_STATUS__C;
				var loggedIn = obj.MODIFIED_BY__C;
				var editAccess = obj.EDITACCESS;
				var cb = r.$().find('.sapMCb');
				var oCb = sap.ui.getCore().byId(cb.attr('id'));
				
			
				if (that.EditAcessmeta.length > 0) {
						for (var i = 0; i < that.EditAcessmeta.length; i++) {
							
										if (that.EditAcessmeta[i].SALESFORCE_PRODUCT_CATEGORY__C === that.selectedCat  && (that.EditAcessmeta[i].BRAND_CODE__C === "" ||
									that.EditAcessmeta[i].BRAND_CODE__C === null) && (that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === "" ||
									that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === null)) {
								if (oCb) {
									oCb.setVisible(false);
								//	that.CheckAll.setVisible(false);
								
								}

							} else if ((that.EditAcessmeta[i].SALESFORCE_PRODUCT_CATEGORY__C === that.selectedCat ) && (that.EditAcessmeta[i].BRAND_CODE__C !==
									"" ||
									that.EditAcessmeta[i].BRAND_CODE__C !== null) && (that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === "" ||
									that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === null)) {

								if (that.EditAcessmeta[i].BRAND_CODE__C === obj.BRAND_CODE__C) {
									//	oMenuBtn.setEnabled(false);
									if (oCb) {
										oCb.setVisible(false);
									//		that.CheckAll.setVisible(false);
									}
								}

							} else if ((that.EditAcessmeta[i].SALESFORCE_PRODUCT_CATEGORY__C === that.selectedCat ) && (that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C !==
									"" ||
									that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C !== null) && (that.EditAcessmeta[i].BRAND_CODE__C === "" ||
									that.EditAcessmeta[i].BRAND_CODE__C === null)) {

								if (that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === obj.ERP_PRODUCT_TYPE__C) {
									//	oMenuBtn.setEnabled(false);
									if (oCb) {
										oCb.setVisible(false);
										//	that.CheckAll.setVisible(false);
									}
								}

							} else if ((that.EditAcessmeta[i].BRAND_CODE__C !== "" || that.EditAcessmeta[i].BRAND_CODE__C !== null) && (that.EditAcessmeta[
										i]
									.SALESFORCE_PRODUCT_CATEGORY__C === "" ||
									that.EditAcessmeta[i].SALESFORCE_PRODUCT_CATEGORY__C === null) && (that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === "" ||
									that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === null)) {

								if (that.EditAcessmeta[i].BRAND_CODE__C === obj.BRAND_CODE__C) {
									//	oMenuBtn.setEnabled(false);
									if (oCb) {
										oCb.setVisible(false);
										//	that.CheckAll.setVisible(false);
									}
								}

							} else if ((that.EditAcessmeta[i].BRAND_CODE__C !== "" && that.EditAcessmeta[i].BRAND_CODE__C !== null) && (that.EditAcessmeta[
										i]
									.ERP_PRODUCT_TYPE__C !== "" &&
									that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C !== null) && (that.EditAcessmeta[i].SALESFORCE_PRODUCT_CATEGORY__C === "" || that.EditAcessmeta[
									i].SALESFORCE_PRODUCT_CATEGORY__C === null)) {

								if ((that.EditAcessmeta[i].BRAND_CODE__C === obj.BRAND_CODE__C) && (that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C ===
									obj.ERP_PRODUCT_TYPE__C)) {
									//	oMenuBtn.setEnabled(false);
									if (oCb) {
										oCb.setVisible(false);
										//	that.CheckAll.setVisible(false);
									}
								}

							} else if ((that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C !==
									"" ||
									that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C !== null) && (that.EditAcessmeta[i].BRAND_CODE__C === "" ||
									that.EditAcessmeta[i].BRAND_CODE__C === null) && (that.EditAcessmeta[i].SALESFORCE_PRODUCT_CATEGORY__C === "" || that.EditAcessmeta[
									i].SALESFORCE_PRODUCT_CATEGORY__C === null)) {

								if (that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === obj.ERP_PRODUCT_TYPE__C) {
									//	oMenuBtn.setEnabled(false);
									if (oCb) {
										oCb.setVisible(false);
										//	that.CheckAll.setVisible(false);
									}
								}

							} else if ((that.EditAcessmeta[i].BRAND_CODE__C !== "" && that.EditAcessmeta[i].BRAND_CODE__C !== null) && (that.EditAcessmeta[
										i]
									.ERP_PRODUCT_TYPE__C !== "" &&
									that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C !== null) && (that.EditAcessmeta[i].SALESFORCE_PRODUCT_CATEGORY__C === that.selectedCat  ||
									that.EditAcessmeta[
										i].SALESFORCE_PRODUCT_CATEGORY__C === that.selectedCat )) {
								if (oCb) {
									oCb.setVisible(false);
									//	that.CheckAll.setVisible(false);
								}

							
							}
								

						

						}
					}
			});
		},

		onAPSearch: function (oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onAPRefresh();
				return;
			}

			var header = sap.ui.getCore().getModel("configModel").getProperty("/apHeader");
			var width = this.getView()._oContextualSettings.contextualWidth;
			if (width > 700) {
				var f0 = header[0].field.includes("PRODUCT__R.") ? header[0].field.replace("PRODUCT__R.", "") : header[0].field;
				var f1 = header[1].field.includes("PRODUCT__R.") ? header[1].field.replace("PRODUCT__R.", "") : header[1].field;
				var f2 = header[2].field.includes("PRODUCT__R.") ? header[2].field.replace("PRODUCT__R.", "") : header[2].field;
				var f3 = header[3].field.includes("PRODUCT__R.") ? header[3].field.replace("PRODUCT__R.", "") : header[3].field;
				var f4 = header[4].field.includes("PRODUCT__R.") ? header[4].field.replace("PRODUCT__R.", "") : header[4].field;
			}
			/*else {
				var f0 = "intro";
				var f1 = "title";
				var f2 = "number";
				var f3 = "numUnit";
			}*/
			var aFilters = [];
			var sQuery = oEvent.getParameter("query");
			if (sQuery && sQuery.length > 0) {
				var filter1 = new Filter(f0, FilterOperator.Contains, sQuery);
				var filter2 = new Filter(f1, FilterOperator.Contains, sQuery);
				var filter3 = new Filter(f2, FilterOperator.Contains, sQuery);
				var filter4 = new Filter(f3, FilterOperator.Contains, sQuery);
				var filter5 = new Filter(f4, FilterOperator.Contains, sQuery);
				aFilters.push(filter1, filter2, filter3, filter4, filter5);

				var oFilter = new Filter(aFilters);

				var oList = this.byId("productList");
				var oBinding = oList.getBinding("items");
				oBinding.filter(oFilter, "Application");
			} else {
				//Start of changes by <JAYANT PRAKASH> for <5243>
				//this.bindRecords();
				this.bindAPRecords();
				//End of changes by <JAYANT PRAKASH> for <5243>
			}

		},

		onAPRefresh: function () {
			this.byId("productList").getBinding("items").refresh();
			// this.setModel(this.oModel, "MasterModel");
			// this.getModel("MasterModel").refresh();
		},

		/*onAPSortDialog: function (oEvent) {
			var sDialogTab = "sort";

			var headerData = sap.ui.getCore().getModel("configModel").getProperty("/apHeader");

			// load asynchronous XML fragment
			if (!this.sortDialog) {
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
			}
			this.sortDialog.open();
		},*/

		onAddToList: function (oEvent) {
			var oTable = this.getView().byId("productList");
			var selectedRecords = oTable.getSelectedItems();
			var apData = this.getView().getModel("apViewModel").getData();
			var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});

			var payload = [];
			if (selectedRecords.length > 0) {
				for (var i = 0; i < selectedRecords.length; i++) {
					var selectedPath = selectedRecords[i].getBindingContext("apViewModel").getPath();
					var path = selectedPath.slice(1, selectedPath.length);
					var records = {
						"Accountno": this.accNo,
						"Productuniquekey": apData[path].PRODUCT_UNIQUE_KEY__C,
						"Whcode": apData[path].WAREHOUSE_CODE__C,
						"Brandcode": apData[path].BRAND_CODE__C,
						"Productcategory": apData[path].SALESFORCE_PRODUCT_CATEGORY__C,
						"Cplrecordid": new Date().getTime().toString() + (Math.floor(Math.random() * (100000 - 9999)) + 9999),
						"Startdate": dateFormat.format(new Date()),
						"Enddate": "4000-12-31",
						"Createddatetime": dateFormat.format(new Date()),
						"Modifieddatetime": dateFormat.format(new Date()),
						"Approvalstatus": "1",
						"Modifiedby": this.loggedInUser
					};
					payload.push(records);
				}
			} else {
				MessageBox.error("Please select at least one product");
				return;
			}

			var addProdURL = "";
			switch (this.selectedCat) {
			case "Residential Broadloom":
				addProdURL = "pricing/CPLAddProductRB.xsjs";
				break;
			case "Resilient Tile":
				addProdURL = "pricing/CPLAddProductRT.xsjs";
				break;
			case "RevWood":
				addProdURL = "pricing/CPLAddProductRW.xsjs";
				break;
			case "Carpet Tile":
				addProdURL = "pricing/CPLAddProductCT.xsjs";
				break;
			case "Commercial Broadloom":
				addProdURL = "pricing/CPLAddProductCB.xsjs";
				break;
			case "Cushion":
				addProdURL = "pricing/CPLAddProductCushion.xsjs";
				break;
			case "TecWood":
				addProdURL = "pricing/CPLAddProductTW.xsjs";
				break;
			case "SolidWood":
				addProdURL = "pricing/CPLAddProductSW.xsjs";
				break;
			case "Resilient Sheet":
				addProdURL = "pricing/CPLAddProductRS.xsjs";
				break;
			case "Tile":
				addProdURL = "pricing/CPLAddProductTile.xsjs";
				break;
			case "Accessories":
				addProdURL = "pricing/CPLAddProductAcc.xsjs";
				break;
			default:
				addProdURL = "";
				break;
			}
			var that = this;
			$.ajax({
				url: addProdURL,
				contentType: "application/json",
				method: "POST",
				async: false,
				data: JSON.stringify(payload),
				success: function (response) {
					console.log(response);
					sap.ui.getCore().getModel("configModel").setProperty("/concatDataFlag", true);
					that.onNavBack();
				},
				error: function (err) {
					console.log(err);
				}
			});

		},
		
		//Added by Diksha 3/2/2021 for lock pricng//
			onProductSelect: function (oEvent) {
			var that = this;
			var oTable = this.getView().byId("productList");
			var header = oTable.$().find('thead');
			oTable.getItems().forEach(function (r) {
				
				var obj = r.getBindingContext("apViewModel").getObject();
				var oStatus = obj.APPROVAL_STATUS__C;
				var loggedIn = obj.MODIFIED_BY__C;
			
			
					if (that.EditAcessmeta.length > 0) {
					for (var i = 0; i < that.EditAcessmeta.length; i++) {
						
									if (that.EditAcessmeta[i].SALESFORCE_PRODUCT_CATEGORY__C === that.selectedCat  && (that.EditAcessmeta[i].BRAND_CODE__C === "" ||
								that.EditAcessmeta[i].BRAND_CODE__C === null) && (that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === "" ||
								that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === null)) {
							r.setSelected(false);
						} else if ((that.EditAcessmeta[i].SALESFORCE_PRODUCT_CATEGORY__C === that.selectedCat ) && (that.EditAcessmeta[i].BRAND_CODE__C !==
								"" ||
								that.EditAcessmeta[i].BRAND_CODE__C !== null) && (that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === "" ||
								that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === null)) {

							if (that.EditAcessmeta[i].BRAND_CODE__C === obj.BRAND_CODE__C) {
								//	oMenuBtn.setEnabled(false);
								r.setSelected(false);
							}

						} else if ((that.EditAcessmeta[i].SALESFORCE_PRODUCT_CATEGORY__C === that.selectedCat ) && (that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C !==
								"" ||
								that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C !== null) && (that.EditAcessmeta[i].BRAND_CODE__C === "" ||
								that.EditAcessmeta[i].BRAND_CODE__C === null)) {

							if (that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === obj.ERP_PRODUCT_TYPE__C) {
								//	oMenuBtn.setEnabled(false);
									r.setSelected(false);
							}

						} else if ((that.EditAcessmeta[i].BRAND_CODE__C !== "" || that.EditAcessmeta[i].BRAND_CODE__C !== null) && (that.EditAcessmeta[
									i]
								.SALESFORCE_PRODUCT_CATEGORY__C === "" ||
								that.EditAcessmeta[i].SALESFORCE_PRODUCT_CATEGORY__C === null) && (that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === "" ||
								that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === null)) {

							if (that.EditAcessmeta[i].BRAND_CODE__C === obj.BRAND_CODE__C) {
								//	oMenuBtn.setEnabled(false);
									r.setSelected(false);
							}

						} else if ((that.EditAcessmeta[i].BRAND_CODE__C !== "" && that.EditAcessmeta[i].BRAND_CODE__C !== null) && (that.EditAcessmeta[
									i]
								.ERP_PRODUCT_TYPE__C !== "" &&
								that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C !== null) && (that.EditAcessmeta[i].SALESFORCE_PRODUCT_CATEGORY__C === "" || that.EditAcessmeta[
								i].SALESFORCE_PRODUCT_CATEGORY__C === null)) {

							if ((that.EditAcessmeta[i].BRAND_CODE__C === obj.BRAND_CODE__C) && (that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C ===
								obj.ERP_PRODUCT_TYPE__C)) {
								//	oMenuBtn.setEnabled(false);
									r.setSelected(false);
							}

						} else if ((that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C !==
								"" ||
								that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C !== null) && (that.EditAcessmeta[i].BRAND_CODE__C === "" ||
								that.EditAcessmeta[i].BRAND_CODE__C === null) && (that.EditAcessmeta[i].SALESFORCE_PRODUCT_CATEGORY__C === "" || that.EditAcessmeta[
								i].SALESFORCE_PRODUCT_CATEGORY__C === null)) {

							if (that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === obj.ERP_PRODUCT_TYPE__C) {
								//	oMenuBtn.setEnabled(false);
									r.setSelected(false);
							}

						} else if ((that.EditAcessmeta[i].BRAND_CODE__C !== "" && that.EditAcessmeta[i].BRAND_CODE__C !== null) && (that.EditAcessmeta[
									i]
								.ERP_PRODUCT_TYPE__C !== "" &&
								that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C !== null) && (that.EditAcessmeta[i].SALESFORCE_PRODUCT_CATEGORY__C === that.selectedCat  ||
								that.EditAcessmeta[
									i].SALESFORCE_PRODUCT_CATEGORY__C === that.selectedCat )) {
							r.setSelected(false);

						

						}
							

					

					}
				}
			});
		},
	});

});