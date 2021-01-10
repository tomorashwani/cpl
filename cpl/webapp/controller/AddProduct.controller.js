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
			this.getView().byId("apProdCat").setModel(lModel, "local");
		},

		onAfterRendering: function () {

			this.getView().byId("apWH").setModel(sap.ui.getCore().getModel("configModel"), "warehouses");
			this.getView().byId("apBrand").setModel(sap.ui.getCore().getModel("configModel"), "brandModel");

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
		},

		onBypassed: function () {},

		fetchAddProducts: function () {
			// console.log("Fetch Add Product");
			var brand = sap.ui.getCore().getModel("configModel").getProperty("/allBrand");

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
							console.log(response);
							apViewModel.setData(response);
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
			// var oAccountDetails = this.getView().byId("lblAccountNO");
			// if (this.selectedCat === "Cushion") {
			// if(pViewData.length > 0) {
			// oAccountDetails.setText(pViewData[0].ACCOUNT_NAME__C + " (" + pViewData[0].ACCOUNT__C + ")");
			// }
			// } else {
			// oAccountDetails.setText("");
			// }

			var oTable = this.getView().byId("productList");
			oTable.removeAllItems();
			oTable.removeAllColumns();

			var tHeader = [];
			this.gridmeta = sap.ui.getCore().getModel("configModel").getData();
			this.primaryCols = this.gridmeta.filter((a) => (a['PRODUCT_CATEGORY__C'] == this.selectedCat && a.IS_ADD_PRODUCT__C == "X")).sort(
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
					header: new sap.m.Label({
						text: this.primaryCols[i]['SHORT_LABEL__C']
					})
				});
				oTable.addColumn(oColumn);
				var tData = {
					"key": this.primaryCols[i].ADD_PRODUCT_SORT_ORDER__C,
					"header": this.primaryCols[i].SHORT_LABEL__C,
					"field": this.primaryCols[i].FIELD_API_NAME__C.toUpperCase(),
					"type": this.primaryCols[i].DATA_TYPE__C
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

			//tHeader.sort(that.sortTHeader);
			for (var j = 0; j < tHeader.length; j++) {
				if (tHeader[j].type === "Currency") {
					var cell1 = new sap.m.Text({
						text: "$ " + "{pViewModel>" + tHeader[j].field.replace('PRODUCT__R.', '') + "}"
					});
					oCell.push(cell1);
				} else {
					var cell1 = new sap.m.Text({
						text: "{pViewModel>" + tHeader[j].field.replace('PRODUCT__R.', '') + "}"
					});
					oCell.push(cell1);
				}
			}

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

			/*
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
						}*/
			// var lsModel = new JSONModel();

			// lsModel.setData(lData);
			// this.getView().setModel(lsModel, "listModel");
		},
	});

});