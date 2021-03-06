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

	return BaseController.extend("cf.cpl.controller.MultiEdit", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf cf.cpl.view.MultiEdit
		 */
		onInit: function () {
			var that = this;
			var oDeviceModel = new JSONModel(Device);
			this.setModel(oDeviceModel, "device");

			//Added by Diksha for story 1901 -task 5236- 28/02/2021//
			that.EditAcessmeta = sap.ui.getCore().getModel("configModel").getProperty("/EditAccessmeta");

			//End by Diksha for story 1901 -task 5236//

			var oList = this.byId("meList");

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

			this.getRouter().getRoute("multiEdit").attachPatternMatched(this._onMasterMatched, this);
			this.getRouter().attachBypassed(this.onBypassed, this);

		},

		_onMasterMatched: function (oEvent) {
			this.selectedCat = sap.ui.getCore().getModel("configModel").getProperty("/selectedCat");
			if (this.selectedCat === "Resilient Tile") {
				sap.ui.getCore().getModel("configModel").setProperty("/selectedCat", "Resilient Tile & Plank");
			}
			this.selectedWH = sap.ui.getCore().getModel("configModel").getProperty("/selectedWH");
			this.selectedChannel = sap.ui.getCore().getModel("configModel").getProperty("/selectedChannel");
			this.loggedInUser = sap.ui.getCore().getModel("configModel").getProperty("/loggedInUser");
			this.fetchTotal = 100; //`Top` variable in teh ajax call
			this.fetchSkip = 0;
			this.getBlackProduct = false;
			this.mainData = [];
			this.completeResult = false;

			this.getView().setModel(sap.ui.getCore().getModel("configModel"), "multiEditModel");

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

			var meViewModel = new JSONModel();
			this.getView().setModel(meViewModel, "meViewModel");
			sap.ui.getCore().setModel(meViewModel, "meViewModel");

			this.fetchProducts();
			this.getView().byId("meList").setModel(meViewModel, "meViewModel");

			// 			var meViewModel = sap.ui.getCore().getModel("meViewModel");

			var multiPricingFlag = sap.ui.getCore().getModel("configModel").getProperty("/multiPricing");
			sap.ui.getCore().getModel("configModel").setProperty("/multiPricing", true);
			this.multiEditType = sap.ui.getCore().getModel("configModel").getProperty("/multiEditType");

			if (this.multiEditType === "Edit Current Prices") {
				this.getView().byId("meSaveBtnText").setText("Set Multi Pricing");
			} else if (this.multiEditType === "Create Limited Time Prices") {
				this.getView().byId("meSaveBtnText").setText("Set Limited Time Price");
			} else if (this.multiEditType === "Remove Current Prices") {
				this.getView().byId("meSaveBtnText").setText("Remove Selected Product");
			}

			// this.bindMERecords();

			// this.fetchAddProducts();
			// var meViewModel = sap.ui.getCore().getModel("meViewModel");
		},

		onBypassed: function () {},

		onAfterRendering: function (oEvent) {
			$("#container-cpl---multiedit--meList").on('scroll', {
				g: this
			}, this.loadOnScroll);

			sap.ui.getCore().getModel("configModel").setProperty("/concatDataFlag", false);
			this.bindMERecords();
		},

		/*loadOnScroll: function (e) {
			if ($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight) {
				console.log('This is the bottom of the container');
				if (this.globalSearch === false || this.globalSearch === undefined) {
					if (e.data.g.endResult === false) {
						// e.data.g.fetchTotal = e.data.g.fetchTotal + 100;
						e.data.g.fetchTotal = 100;
						e.data.g.fetchSkip = e.data.g.fetchSkip + 100;
						e.data.g.fetchProducts();
					}
				}
			}
		},*/

		bindMERecords: function () {
			var meViewModel = sap.ui.getCore().getModel("meViewModel");
			var pViewData = meViewModel.getData();

			/*var oAccountDetails = this.getView().byId("lblAccountNO");
			if (this.selectedCat === "Cushion") {
				if (pViewData.length > 0) {
					oAccountDetails.setText(pViewData[0].ACCOUNT_NAME__C + " (" + pViewData[0].ACCOUNT__C + ")");
				}
			} else {
				oAccountDetails.setText("");
			}*/

			var oTable = this.getView().byId("meList");
			oTable.setModel(meViewModel, "meViewModel");
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
			oTable.setInfoToolbar(oOverFlow);

			var tHeader = [];
			this.gridmeta = sap.ui.getCore().getModel("configModel").getData();
			this.primaryCols = this.gridmeta.filter((a) => (a.IS_PRIMARY_DISPLAY__C == "X" && a['PRODUCT_CATEGORY__C'] == this.selectedCat)).sort(
				this.sortGridMeta);

			// added for Menu Button Header.. 
			/*if (this.primaryCols.length > 0) {
				var oColumn = new sap.m.Column({
					header: new sap.m.Label({
						text: ""
					})
				});
				oTable.addColumn(oColumn);
			}*/
			for (var i = 0; i < this.primaryCols.length; i++) {
				var oColumn = new sap.m.Column({
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

			if (sap.ui.getCore().byId("meInfoBtn")) {
				sap.ui.getCore().byId("meInfoBtn").destroy();
			}
			var oButton = new sap.m.Button("meInfoBtn", {
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

			if (sap.ui.getCore().byId("meResPopOver")) {
				sap.ui.getCore().byId("meResPopOver").destroy();
			}
			var oResPopOver = new sap.m.ResponsivePopover("meResPopOver", {
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

			attachPopoverOnMouseover(sap.ui.getCore().byId("meInfoBtn"), sap.ui.getCore().byId("meResPopOver"));

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

				// Added CPL_PRICE_ID__C to the last column
				var oColumn = new sap.m.Column({
					header: new sap.m.Label({
						text: "",
						visible: false
					})
				});
				oTable.addColumn(oColumn);
				var tData = {
					"key": this.primaryCols.length + 1,
					"header": "",
					"field": "CPL_PRICE_ID__C",
					"type": "CPLPriceID"
				};
				tHeader.push(tData);
				//
			}

			sap.ui.getCore().getModel("configModel").setProperty("/mHeader", tHeader);
			// sap.ui.getCore().getModel("configModel").setProperty("/selectedCat", this.selectedCat);

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
						}
						if (date.split("-").length > 1) {
							pViewData[i][dateFields[k].field] = dateFormat.format(new Date(date));
						}
						//updated - Pratik//
					}
				}
			}

			var oCell = [];

			//tHeader.sort(that.sortTHeader);
			for (var j = 0; j < tHeader.length; j++) {
				if (tHeader[j].type === "Currency") {
					var cell1 = new sap.m.Text({
						text: "$ " + "{meViewModel>" + tHeader[j].field.replace('PRODUCT__R.', '') + "}"
					});
					oCell.push(cell1);
				} else if (tHeader[j].type === "InfoButton") {
					var cell1 = new sap.m.Text({
						text: "{meViewModel>" + tHeader[j].field + "}"
					});
					oCell.push(cell1);
				} else if (tHeader[j].type === "CPLPriceID") {
					var cell1 = new sap.m.Text({
						text: "{meViewModel>" + tHeader[j].field.replace('PRODUCT__R.', '') + "}",
						visible: false
					});
					oCell.push(cell1);
				} else {
					var cell1 = new sap.m.Text({
						text: "{meViewModel>" + tHeader[j].field.replace('PRODUCT__R.', '') + "}"
					});
					oCell.push(cell1);
				}
			}

			var aColList = new sap.m.ColumnListItem({
				cells: oCell
					// type: "Navigation",
					// press: [this.onSelectionChange, this]
			});
			oTable.bindItems("meViewModel>/", aColList);

			// Checkbox visibility
			var that = this;
			that.CheckAll = oTable._getSelectAllCheckbox();
			var header = oTable.$().find('thead');
			oTable.getItems().forEach(function (r) {
				var obj = r.getBindingContext("meViewModel").getObject();
				var oStatus = obj.APPROVAL_STATUS__C;
				var loggedIn = obj.MODIFIED_BY__C;
				var editAccess = obj.EDITACCESS;
				var cb = r.$().find('.sapMCb');
				var oCb = sap.ui.getCore().byId(cb.attr('id'));
				if ((oStatus === "1" || oStatus === "2" || oStatus === "3" || oStatus === "4" || oStatus === "A" || oStatus === "F") && loggedIn ===
					that.loggedInUser) {
					if (oCb) {
						oCb.setVisible(false);
					}
				}
				if (editAccess === "false") {
					if (oCb) {
						oCb.setVisible(false);
					}
				}

				//Added by Diksha story 1901 task 5236 - 28/02/2021 //
				if (that.EditAcessmeta.length > 0) {
					for (var i = 0; i < that.EditAcessmeta.length; i++) {

						if (that.EditAcessmeta[i].SALESFORCE_PRODUCT_CATEGORY__C === that.selectedCat && (that.EditAcessmeta[i].BRAND_CODE__C === "" ||
								that.EditAcessmeta[i].BRAND_CODE__C === null) && (that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === "" ||
								that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === null)) {
							if (oCb) {
								oCb.setVisible(false);

							}

						} else if ((that.EditAcessmeta[i].SALESFORCE_PRODUCT_CATEGORY__C === that.selectedCat) && (that.EditAcessmeta[i].BRAND_CODE__C !==
								"" ||
								that.EditAcessmeta[i].BRAND_CODE__C !== null) && (that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === "" ||
								that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === null)) {

							if (that.EditAcessmeta[i].BRAND_CODE__C === obj.BRAND_CODE__C) {
								//	oMenuBtn.setEnabled(false);
								if (oCb) {
									oCb.setVisible(false);
								}
							}

						} else if ((that.EditAcessmeta[i].SALESFORCE_PRODUCT_CATEGORY__C === that.selectedCat) && (that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C !==
								"" ||
								that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C !== null) && (that.EditAcessmeta[i].BRAND_CODE__C === "" ||
								that.EditAcessmeta[i].BRAND_CODE__C === null)) {

							if (that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === obj.ERP_PRODUCT_TYPE__C) {
								//	oMenuBtn.setEnabled(false);
								if (oCb) {
									oCb.setVisible(false);
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
								}
							}

						} else if ((that.EditAcessmeta[i].BRAND_CODE__C !== "" && that.EditAcessmeta[i].BRAND_CODE__C !== null) && (that.EditAcessmeta[
									i]
								.ERP_PRODUCT_TYPE__C !== "" &&
								that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C !== null) && (that.EditAcessmeta[i].SALESFORCE_PRODUCT_CATEGORY__C === that.selectedCat ||
								that.EditAcessmeta[
									i].SALESFORCE_PRODUCT_CATEGORY__C === that.selectedCat)) {
							if (oCb) {
								oCb.setVisible(false);
							}

						}

					}
				}

				//End by Diksha story 1901 task 5236 - 28/02/2021 //

			});

			//changes for Sorting by Blue color 
			// var that = this;
			if (pViewData.length > 0) {

				for (var i = 0; i < oTable.getModel("meViewModel").getData().length; i++) {
					if ((oTable.getModel("meViewModel").getData()[i].APPROVAL_STATUS__C == "1" || oTable.getModel("meViewModel").getData()[i].APPROVAL_STATUS__C ==
							"4") && oTable.getModel("meViewModel").getData()[i].MODIFIED_BY__C == this.loggedInUser) {
						for (var j = 0; j < oTable.getItems().length; j++) {
							if (i == j) {
								for (var k = 0; k < oTable.getItems()[j].getCells().length; k++) {
									oTable.getItems()[j].getCells()[k].addStyleClass("clrBlue");
								}
							}
						}
					} else if ((oTable.getModel("meViewModel").getData()[i].APPROVAL_STATUS__C == "2" || oTable.getModel("meViewModel").getData()[i].APPROVAL_STATUS__C ==
							"3") && oTable.getModel("meViewModel").getData()[i].MODIFIED_BY__C == this.loggedInUser) {
						for (var j = 0; j < oTable.getItems().length; j++) {
							if (i == j) {
								for (var k = 0; k < oTable.getItems()[j].getCells().length; k++) {
									oTable.getItems()[j].getCells()[k].addStyleClass("clrRed");
								}
							}
						}
					} else if (oTable.getModel("meViewModel").getData()[i].APPROVAL_STATUS__C == "A" && oTable.getModel("meViewModel").getData()[i].MODIFIED_BY__C ==
						this.loggedInUser) {
						for (var j = 0; j < oTable.getItems().length; j++) {
							if (i == j) {
								for (var k = 0; k < oTable.getItems()[j].getCells().length; k++) {
									oTable.getItems()[j].getCells()[k].addStyleClass("clrGreen");
								}
							}
						}
					} else if (oTable.getModel("meViewModel").getData()[i].APPROVAL_STATUS__C == "F" && oTable.getModel("meViewModel").getData()[i].MODIFIED_BY__C ==
						this.loggedInUser) {
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

		},

		/*Start of Multi Edit Price */
		onSetMultiPrice: function (oEvent) {
			this.selectedItems = this.getView().byId("meList").getSelectedItems();
			if (this.selectedItems.length === 0) {
				MessageBox.error("Please select records to modify");
				return;
			}

			var meViewModel = this.getView().byId("meList").getModel("meViewModel");
			var pViewData = meViewModel.getData();
			var editMultiData = [];
			for (var i = 0; i < this.selectedItems.length; i++) {
				var totalCell = this.selectedItems[i].getAggregation("cells").length;
				var data = {
					"cell1": this.selectedItems[i].getAggregation("cells")[1].getText(),
					"cell2": this.selectedItems[i].getAggregation("cells")[2].getText(),
					"cell3": this.selectedItems[i].getAggregation("cells")[3].getText(),
					"cell4": this.selectedItems[i].getAggregation("cells")[4].getText(),
					"cell5": this.selectedItems[i].getAggregation("cells")[5].getText(),
					"cell6": this.selectedItems[i].getAggregation("cells")[6].getText(),
					"cell7": this.selectedItems[i].getAggregation("cells")[7].getText(),
					"cellLst": this.selectedItems[i].getAggregation("cells")[totalCell - 1].getText()
				}
				editMultiData.push(data);
			}
			this.editMultiData = editMultiData;
			this.onOpenMEDialog(editMultiData);
		},

		onOpenMEDialog: function (editMultiData) {
			var meViewModel = this.getView().byId("meList").getModel("meViewModel");
			var pViewData = meViewModel.getData();

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
				a[tHeader[7].field.replace('PRODUCT__R.', '')] = typeof (a[tHeader[7].field.replace('PRODUCT__R.', '')]) === "number" ? "$ " + a[
					tHeader[7].field.replace('PRODUCT__R.', '')].toString() : a[tHeader[7].field.replace('PRODUCT__R.', '')];
				a[tHeader[tHeader.length - 1].field.replace('PRODUCT__R.', '')] = typeof (a[tHeader[tHeader.length - 1].field.replace(
					'PRODUCT__R.', '')]) === "number" ? "$ " + a[
					tHeader[tHeader.length - 1].field.replace('PRODUCT__R.', '')].toString() : a[tHeader[tHeader.length - 1].field.replace(
					'PRODUCT__R.', '')];

				return !editMultiData.filter(function (b) {
					return b.cell1 === a[tHeader[1].field.replace('PRODUCT__R.', '')] && b.cell2 == a[tHeader[2].field.replace(
							'PRODUCT__R.', '')] && b.cell3 == a[tHeader[3].field.replace('PRODUCT__R.', '')] && b.cell4 == a[tHeader[4].field
							.replace('PRODUCT__R.', '')] && b.cell5 == a[tHeader[5].field.replace('PRODUCT__R.', '')] && b.cell6 == a[
							tHeader[6].field.replace('PRODUCT__R.', '')] && b.cell7 == a[tHeader[7].field.replace('PRODUCT__R.', '')] && b.cellLst ===
						a[tHeader[tHeader.length - 1].field.replace('PRODUCT__R.', '')]
				}).length == 0
			});

			// to convert value in decimal
			function decimalPrice(actualPrice) {
				return actualPrice.split(".").length > 1 ? actualPrice.split(".")[1].length < 2 ? actualPrice + "0" : actualPrice : actualPrice +
					".00";
			}

			for (var i = 0; i < editPriceData.length; i++) {
				if (editPriceData[i].BILLING_PRICE_ROLL__C !== undefined && editPriceData[i].BILLING_PRICE_ROLL__C !== null) {
					var actualPrice = editPriceData[i].BILLING_PRICE_ROLL__C.split("$ ")[1];
					editPriceData[i].BILLING_PRICE_ROLL__C = "$ " + decimalPrice(actualPrice);
				}
				if (editPriceData[i].BILLING_PRICE_CUT__C !== undefined && editPriceData[i].BILLING_PRICE_CUT__C !== null) {
					var actualPrice = editPriceData[i].BILLING_PRICE_CUT__C.split("$ ")[1];
					editPriceData[i].BILLING_PRICE_CUT__C = "$ " + decimalPrice(actualPrice);
				}
				if (editPriceData[i].BILLING_PRICE__C !== undefined && editPriceData[i].BILLING_PRICE__C !== null) {
					var actualPrice = editPriceData[i].BILLING_PRICE__C.split("$ ")[1];
					editPriceData[i].BILLING_PRICE__C = "$ " + decimalPrice(actualPrice);
				}

				editPriceData[i].EditRollPrice = typeof (editPriceData[i].BILLING_PRICE_ROLL__C) === "string" ? editPriceData[i].BILLING_PRICE_ROLL__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[i].BILLING_PRICE_ROLL__C.split("$ ")[1]) : parseFloat(editPriceData[i].BILLING_PRICE_ROLL__C) :
					editPriceData[i].BILLING_PRICE_ROLL__C
				editPriceData[0].EditCutPrice = typeof (editPriceData[i].BILLING_PRICE_CUT__C) === "string" ? editPriceData[i].BILLING_PRICE_CUT__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[i].BILLING_PRICE_CUT__C.split("$ ")[1]) : parseFloat(editPriceData[i].BILLING_PRICE_CUT__C) :
					editPriceData[i].BILLING_PRICE_CUT__C;
				editPriceData[i].EditCartonPrice = typeof (editPriceData[i].BILLING_PRICE__C) === "string" ? editPriceData[i].BILLING_PRICE__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[i].BILLING_PRICE__C.split("$ ")[1]) : parseFloat(editPriceData[i].BILLING_PRICE__C) :
					editPriceData[i].BILLING_PRICE__C;

				editPriceData[i].EditEachPrice = typeof (editPriceData[i].BILLING_PRICE__C) === "string" ? editPriceData[i].BILLING_PRICE__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[i].BILLING_PRICE__C.split("$ ")[1]) : parseFloat(editPriceData[i].BILLING_PRICE__C) :
					editPriceData[i].BILLING_PRICE__C;
				//Added by <JAYANT PRAKASH> for <2269>
				editPriceData[i].EditSqYdPrice = typeof (editPriceData[i].BILLING_PRICE__C) === "string" ? editPriceData[i].BILLING_PRICE__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[i].BILLING_PRICE__C.split("$ ")[1]) : parseFloat(editPriceData[i].BILLING_PRICE__C) :
					editPriceData[i].BILLING_PRICE__C;
				//Added by <JAYANT PRAKASH> for <2269>

			}

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

			if (!this._oDialogMultiEditPrice) {
				this._oDialogMultiEditPrice = sap.ui.xmlfragment("cf.cpl.fragments.EditMultiPrice", this);
				this.getView().addDependent(this._oDialogMultiEditPrice);
			}

			var sbMultisurfaceLevel = sap.ui.getCore().byId("sbMultisurfaceLevel");
			var sbMultiAccLevel = sap.ui.getCore().byId("sbMultiAccLevel");
			//Added by <JAYANT PRAKASH> for <2269 >
			var sbMultiCushLevel = sap.ui.getCore().byId("sbMultiCushLevel");
			//Added by <JAYANT PRAKASH> for <2269>
			var that = this;

			if (that.selectedCat === "Accessories") {
				that.onMultiAccesBtnChange();
				sbMultisurfaceLevel.setVisible(false);
				sbMultiAccLevel.setVisible(true);
				sbMultiCushLevel.setVisible(false); //Added by <JAYANT PRAKASH> for <2269>
			}
			//Added by <JAYANT PRAKASH> for <2269>
			else if (that.selectedCat === "Cushion") {
				that.onMultiCushBtnChange();
				sbMultisurfaceLevel.setVisible(false);
				sbMultiAccLevel.setVisible(false);
				sbMultiCushLevel.setVisible(true);
			}
			//Added by <JAYANT PRAKASH> for <2269>
			else {
				that.onMultiSurfaceBtnChange();
				sbMultisurfaceLevel.setVisible(true);
				sbMultiAccLevel.setVisible(false);
				sbMultiCushLevel.setVisible(false); //Added by <JAYANT PRAKASH> for <2269>
			}

			/*this.isLimitedTimeRecord = pViewData.filter(function (a) {
				for (var i = 0; i < editMultiData.length; i++) {
					if (a.PRODUCT_STYLE_NUMBER__C === editMultiData[i].cell1 && a.ISLIMITEDPRICERECORD === true) {
						return a;
					}
				}
				// return a.PRODUCT_STYLE_NUMBER__C === that.editData.cell1 && a.ISLIMITEDPRICERECORD === true;
			});*/

			if (this.multiEditType === "Edit Current Prices") {
				this._oDialogMultiEditPrice.open();
			} else if (this.multiEditType === "Create Limited Time Prices") {
				this.openDialogLimitedPrice(editPriceData);
			} else if (this.multiEditType === "Remove Current Prices") {
				this.onItemRemovePrice(editPriceData);
			}

		},

		onItemRemovePrice: function (editPriceData) {
			var that = this;
			/*var selectedRow = oEvent.getSource().getParent().getParent().getParent();
			var removeData = {
				"cell1": selectedRow.getAggregation("cells")[1].getText(),
				"cell2": selectedRow.getAggregation("cells")[2].getText(),
				"cell3": selectedRow.getAggregation("cells")[3].getText(),
				"cell4": selectedRow.getAggregation("cells")[4].getText(),
				"cell5": selectedRow.getAggregation("cells")[5].getText(),
				"cell6": selectedRow.getAggregation("cells")[6].getText(),
				"cell7": selectedRow.getAggregation("cells")[7].getText()
			}

			var meViewModel = this.getView().getModel("meViewModel");
			var pViewData = meViewModel.getData();

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
			});*/

			var removePriceData = editPriceData;

			var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});

			var meViewModel = this.getView().byId("meList").getModel("meViewModel");
			var pViewData = meViewModel.getData();

			for (var i = 0; i < pViewData.length; i++) {
				if (pViewData[i].CPL_PRICE_ID__C !== null) {
					for (var j = 0; j < removePriceData.length; j++) {
						if (pViewData[i].CPL_PRICE_ID__C === removePriceData[j].CPL_PRICE_ID__C) {
							if (pViewData[i].EDIT_START_DATE != null) {
								if (pViewData[i].EDIT_START_DATE.split("(").length > 1) {
									var startdate = pViewData[i].EDIT_START_DATE.split("(")[1].split(")")[0];
									pViewData[i].EDIT_START_DATE = dateFormat.format(new Date(parseInt(startdate)));
									removePriceData[j].EDIT_START_DATE = pViewData[i].EDIT_START_DATE;
								}
							}
							if (pViewData[i].EDIT_END_DATE != null) {
								if (pViewData[i].EDIT_END_DATE.split("(").length > 1) {
									var enddate = pViewData[i].EDIT_END_DATE.split("(")[1].split(")")[0];
									pViewData[i].EDIT_END_DATE = dateFormat.format(new Date(parseInt(enddate)));
									removePriceData[j].EDIT_END_DATE = pViewData[i].EDIT_END_DATE;
								}
							}
						}
					}
				}
			}

			for (var j = 0; j < removePriceData.length; j++) {
				if (removePriceData[j].CPL_PRICE_ID__C.length === 18) {
					removePriceData[j].isLimitedPrice = true;
				} else {
					removePriceData[j].isLimitedPrice = false;
				}
			}

			var removeModel = new JSONModel(removePriceData);
			this.getView().setModel(removeModel, "removeModel");

			//Start of changes by <JAYANT PRAKASH> for <4059> on <01.06.2021>
			//MessageBox.error("Are you Sure?", {
			MessageBox.error("Are you sure - Remove the records from submission ?", {
				//Endof changes by <JAYANT PRAKASH> for <4059> on <01.06.2021>
				title: "Remove Price",
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				emphasizedAction: "YES",
				onClose: function (sAction) {
					//sap.m.MessageToast.show("Action selected: " + );
					if (sAction === "YES") {
						if (removeModel.getData().length > 0) {
							that.onRemoveCurrentPrice();
						}
					} else {
						that.getView().getModel("meViewModel").setData(undefined);
						// that.fetchProducts();
					}
				}
			});
		},

		onRemoveCurrentPrice: function () {

			var that = this;
			var removePriceData = this.getView().getModel("removeModel").getData();
			var removeUrl = "pricing/MultiRemoveCurrentPrice.xsjs";
			var cplRecordId = new Date().getTime().toString() + (Math.floor(Math.random() * (100000 - 9999)) + 9999);
			// var startDate = removePriceData[0].EDIT_START_DATE;
			// var endDate = removePriceData[0].EDIT_END_DATE;

			function removeCall() {
				var payload = [];
				for (var i = 0; i < removePriceData.length; i++) {
					var data = {
						"Accountno": removePriceData[i].ACCOUNT__C,
						"Productuniquekey": removePriceData[i].PRODUCT_UNIQUE_KEY__C,
						"Whcode": that.selectedWH,
						"Cplpriceid": removePriceData[i].CPL_PRICE_ID__C,
						"Startdate": removePriceData[i].EDIT_START_DATE,
						"Enddate": removePriceData[i].EDIT_END_DATE,
						"Productcategory": that.selectedCat,
						"Cplrecordid": cplRecordId,
						"Approvalstatus": "4",
						"Modifiedby": that.loggedInUser,
					};
					payload.push(data);
				}
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
						g.getView().getModel("meViewModel").setData(undefined);
						// g.fetchProducts();
						g.onNavBack();
						sap.ui.getCore().busyIndicator.close();
					},
					error: function (error) {
						console.log(error);
						g.fetchProducts();
						sap.ui.getCore().busyIndicator.close();
					}
				});
			}

			removeCall();

			/*var std = new Date(startDate);
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
			}*/
			//Comment For bug 4275 by Diksha
			/*if (endDate !== "4000-12-31") {
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
			}*/
		},

		openDialogLimitedPrice: function (editData) {
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
			// var that = this;
			var dpkStartdate = sap.ui.getCore().byId("dpkStartdate");
			var dpkEnddate = sap.ui.getCore().byId("dpkEnddate");
			this.EndDate = dpkEnddate.getValue();
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

			if (new Date(dpkStartdate.getValue()) < new Date(new Date().toDateString())) {
				errormsg.setVisible(true);
				errormsg.setText("Start date should be greater then today");
				return false;
			} else if (new Date(dpkEnddate.getValue()) < new Date(dpkStartdate.getValue())) {
				errormsg.setVisible(true);
				errormsg.setText("End date should not be less then Start date");
				return false;
			} else if (new Date(dpkEnddate.getValue()) > new Date(currDate.toDateString())) {
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

			/*if (this.isLimitedTimeRecord.length > 0) {
				for (var i = 0; i < this.isLimitedTimeRecord.length; i++) {
					var sDate = new Date(this.isLimitedTimeRecord[i].START_DATE__C);
					var eDate = new Date(this.isLimitedTimeRecord[i].END_DATE__C);

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
			}*/
			//End of  check created limited time price record exist or not 

			// that.lmtdPrice = true;
			this.dpkStartdate = dpkStartdate.getValue();
			this.dpkEnddate = dpkEnddate.getValue();

			this._oDialogLimitedPrice.close();
			this.afterCloseLimitedPrice();
			// that.openDialogPgSurface(this.editData);
			if (!this._oDialogMultiEditPrice) {
				this._oDialogMultiEditPrice = sap.ui.xmlfragment("cf.cpl.fragments.EditMultiPrice", this);
				this.getView().addDependent(this._oDialogMultiEditPrice);
			}
			this._oDialogMultiEditPrice.open();

			var sbMultisurfaceLevel = sap.ui.getCore().byId("sbMultisurfaceLevel");
			var sbMultiAccLevel = sap.ui.getCore().byId("sbMultiAccLevel");
			var sbMultiCushLevel = sap.ui.getCore().byId("sbMultiCushLevel"); //Added by <JAYANT PRAKASH> for <2269>
			var that = this;

			if (that.selectedCat === "Accessories") {
				that.onMultiAccesBtnChange();
				sbMultisurfaceLevel.setVisible(false);
				sbMultiAccLevel.setVisible(true);
				sbMultiCushLevel.setVisible(false); //Added by <JAYANT PRAKASH> for <2269>
			}
			//Added by <JAYANT PRAKASH> for <2269>
			else if (that.selectedCat === "Cushion") {
				that.onMultiCushBtnChange();
				sbMultisurfaceLevel.setVisible(false);
				sbMultiAccLevel.setVisible(false);
				sbMultiCushLevel.setVisible(true); //Added by <JAYANT PRAKASH> for <2269>
			}
			//Added by <JAYANT PRAKASH> for <2269>
			else {
				that.onMultiSurfaceBtnChange();
				sbMultisurfaceLevel.setVisible(true);
				sbMultiAccLevel.setVisible(false);
				sbMultiCushLevel.setVisible(false); //Added by <JAYANT PRAKASH> for <2269>
			}

			// this.onOpenMEDialog(this.editMultiData);
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
			var btnBack = sap.ui.getCore().byId("btnBackMulti");
			if (val === "0") {
				btnBack.setVisible(false);
			} else {
				btnBack.setVisible(true);
			}
		},

		OnBackMultiLimitedPrice: function (oEvent) {
			var that = this;
			this._oDialogMultiEditPrice.close();
			that.afterCloseMultiPrice();
			that.openDialogLimitedPrice();
			var dpkStartdate = sap.ui.getCore().byId("dpkStartdate").setValue(that.dpkStartdate);
			var dpkEnddate = sap.ui.getCore().byId("dpkEnddate").setValue(that.dpkEnddate);
		},

		onMultiAccesBtnChange: function (oEvent) {
			var sbMultiAccLevel = sap.ui.getCore().byId("sbMultiAccLevel");
			var lblPrice = sap.ui.getCore().byId("lblPrice");
			if (sbMultisurfaceLevel.getSelectedKey() !== "") {
				lblPrice.setText(sbMultiAccLevel.getSelectedKey() + " Price");
			} else {
				lblPrice.setText("TM Price");
			}

		},

		onMultiSurfaceBtnChange: function (oEvent) {

			var sbMultisurfaceLevel = sap.ui.getCore().byId("sbMultisurfaceLevel");
			var lblPrice = sap.ui.getCore().byId("lblPrice");
			if (sbMultisurfaceLevel.getSelectedKey() !== "") {
				lblPrice.setText(sbMultisurfaceLevel.getSelectedKey() + " Price");
			} else {
				lblPrice.setText("TM1 Price");
			}
		},
		//Added by <JAYANT PRAKASH> for <2269>
		onMultiCushBtnChange: function (oEvent) {

			var sbMultiCushLevel = sap.ui.getCore().byId("sbMultiCushLevel");
			var lblPrice = sap.ui.getCore().byId("lblPrice");
			if (sbMultiCushLevel.getSelectedKey() !== "") {
				lblPrice.setText(sbMultiCushLevel.getSelectedKey() + " Price");
			} else {
				lblPrice.setText("TM Price");
			}
		},
		//Added by <JAYANT PRAKASH> for <2269>

		onbtnIncPressVal: function (oEvent) {

			var that = this;
			var lblPriceval = sap.ui.getCore().byId("lblPriceval");
			var newpriceval = oEvent.getSource().getText().split("$");
			var oldpricevalue = lblPriceval.getText().split("$");
			var lbloperator = lblPriceval.getText().split("$")[0];
			//var output = that.onincdecval(newpriceval[0], parseFloat(newpriceval[1]), parseFloat(oldpricevalue[1]));
			var oldvalue = parseFloat(oldpricevalue[1]);
			var newvalue = parseFloat(newpriceval[1]);
			var opearator = newpriceval[0];
			oldvalue = parseFloat(lbloperator + oldvalue);
			if (oldvalue < 0.00 || oldvalue < 0) {
				oldvalue = 0.00;
			}
			newvalue = oldvalue + newvalue;
			lblPriceval.setText(opearator + "$" + newvalue.toFixed(2));
		},

		onbtnDecPressVal: function (oEvent) {

			var that = this;
			var lblPriceval = sap.ui.getCore().byId("lblPriceval");
			var newpriceval = oEvent.getSource().getText().split("$");
			var oldpricevalue = lblPriceval.getText().split("$");
			var lbloperator = lblPriceval.getText().split("$")[0];
			//var output = that.onincdecval(newpriceval[0], parseFloat(newpriceval[1]), parseFloat(oldpricevalue[1]));

			var oldvalue = parseFloat(oldpricevalue[1]);
			var newvalue = parseFloat(newpriceval[1]);
			var opearator = newpriceval[0];
			oldvalue = parseFloat(lbloperator + oldvalue);
			if (oldvalue >= 0.00 || oldvalue >= 0) {
				oldvalue = 0.00;
			}
			newvalue = oldvalue - newvalue;
			lblPriceval.setText(opearator + "$" + newvalue.toFixed(2).toString().split("-")[1]);
		},

		afterCloseMultiPrice: function () {
			if (this._oDialogMultiEditPrice) {
				this._oDialogMultiEditPrice.destroy();
				this._oDialogMultiEditPrice = null;
			}
		},

		OnCancelMultiPrice: function () {
			this._oDialogMultiEditPrice.close();
		},

		OnNextMultiPrice: function () {

			var that = this;
			var selectedLevel = sap.ui.getCore().byId("lblPrice");
			that.selectedMELevel = selectedLevel.getText().split(" ")[0];
			var newPrice = sap.ui.getCore().byId("lblPriceval");
			that.newPrice = newPrice.getText();
			this._oDialogMultiEditPrice.close();
			that.afterCloseMultiPrice();

			if (!this._oDialogJustification) {
				this._oDialogJustification = sap.ui.xmlfragment("cf.cpl.fragments.Justification", this);
				this.getView().addDependent(this._oDialogJustification);
				this._oDialogJustification.setModel(sap.ui.getCore().getModel("configModel"), "configModel");
			}

			this._oDialogJustification.open();
		},

		onBackJustification: function (oEvent) {
			this._oDialogJustification.close();
			this.afterCloseJustifcation();
			//added for set price on back button 
			this.isBackEditPrice = true;
			//added for set price on back button 
			// that.openDialogPgSurface(this.editData);
			// this.onOpenMEDialog(this.editMultiData);
			if (this.multiEditType === "Edit Current Prices") {
				// this._oDialogMultiEditPrice.open();
				this.onOpenMEDialog(this.editMultiData);
			} else if (this.multiEditType === "Create Limited Time Prices") {
				// this.openDialogLimitedPrice(editPriceData);
				if (!this._oDialogMultiEditPrice) {
					this._oDialogMultiEditPrice = sap.ui.xmlfragment("cf.cpl.fragments.EditMultiPrice", this);
					this.getView().addDependent(this._oDialogMultiEditPrice);
				}
				this._oDialogMultiEditPrice.open();
				var sbMultisurfaceLevel = sap.ui.getCore().byId("sbMultisurfaceLevel");
				var sbMultiAccLevel = sap.ui.getCore().byId("sbMultiAccLevel");

				if (this.selectedCat === "Accessories") {
					this.onMultiAccesBtnChange();
					sbMultisurfaceLevel.setVisible(false);
					sbMultiAccLevel.setVisible(true);
					sbMultiCushLevel.setVisible(false); //Added by <JAYANT> for <2269>
				}
				//Added by <JAYANT> for <2269>
				else if (this.selectedCat === "Cushion") {
					this.onMultiCushBtnChange();
					sbMultisurfaceLevel.setVisible(false);
					sbMultiAccLevel.setVisible(false);
					sbMultiCushLevel.setVisible(true); //Added by <JAYANT> for <2269>
				}
				//Added by <JAYANT> for <2269>
				else {
					this.onMultiSurfaceBtnChange();
					sbMultisurfaceLevel.setVisible(true);
					sbMultiAccLevel.setVisible(false);
					sbMultiCushLevel.setVisible(false); //Added by <JAYANT> for <2269>
				}

				// this.onOpenMEDialog(this.editMultiData);
				this.showbackbtn("1");
			}
		},

		onProductSelect: function (oEvent) {
			var that = this;
			var oTable = this.getView().byId("meList");
			var header = oTable.$().find('thead');
			oTable.getItems().forEach(function (r) {
				var obj = r.getBindingContext("meViewModel").getObject();
				var oStatus = obj.APPROVAL_STATUS__C;
				var loggedIn = obj.MODIFIED_BY__C;
				if ((oStatus === "1" || oStatus === "2" || oStatus === "3" || oStatus === "4" || oStatus === "A" || oStatus === "F") && loggedIn ===
					that.loggedInUser) {
					r.setSelected(false);
				}

				//Added by Diksha for story 1901 -task 5236- 28/02/2021//
				if (that.EditAcessmeta.length > 0) {
					for (var i = 0; i < that.EditAcessmeta.length; i++) {

						if (that.EditAcessmeta[i].SALESFORCE_PRODUCT_CATEGORY__C === that.selectedCat && (that.EditAcessmeta[i].BRAND_CODE__C === "" ||
								that.EditAcessmeta[i].BRAND_CODE__C === null) && (that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === "" ||
								that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === null)) {
							r.setSelected(false);
						} else if ((that.EditAcessmeta[i].SALESFORCE_PRODUCT_CATEGORY__C === that.selectedCat) && (that.EditAcessmeta[i].BRAND_CODE__C !==
								"" ||
								that.EditAcessmeta[i].BRAND_CODE__C !== null) && (that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === "" ||
								that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C === null)) {

							if (that.EditAcessmeta[i].BRAND_CODE__C === obj.BRAND_CODE__C) {
								//	oMenuBtn.setEnabled(false);
								r.setSelected(false);
							}

						} else if ((that.EditAcessmeta[i].SALESFORCE_PRODUCT_CATEGORY__C === that.selectedCat) && (that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C !==
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
								that.EditAcessmeta[i].ERP_PRODUCT_TYPE__C !== null) && (that.EditAcessmeta[i].SALESFORCE_PRODUCT_CATEGORY__C === that.selectedCat ||
								that.EditAcessmeta[
									i].SALESFORCE_PRODUCT_CATEGORY__C === that.selectedCat)) {
							r.setSelected(false);

						}

					}
				}

				//Added by Diksha for story 1901 -task 5236- 28/02/2021//
			});
		},

		onMultiPricing: function (oEvent) {
			var that = this;
			var oModelPromo = that.getView().getModel("promoModel");
			var editPriceData = this.getView().getModel("editModel").getData();
			/*var txtRoll1 = sap.ui.getCore().byId("idtxtRoll1").setText(that.txtRoll);
			var txtCut1 = sap.ui.getCore().byId("idtxtCut1").setText(that.txtCut);

			var txtCarton11 = sap.ui.getCore().byId("idtxtCarton1").setText(that.txtCarton);
			var txtEach11 = sap.ui.getCore().byId("idtxtEach1").setText(that.txtEach);*/
			var txtPromocode = sap.ui.getCore().byId("txtPromocode");
			var lblPromocodeMsg = sap.ui.getCore().byId("lblPromocodeMsg");
			var txtComment = sap.ui.getCore().byId("txtComment");
			var lblcommenterrmsg = sap.ui.getCore().byId("lblcommenterrmsg");
			var rdb1 = sap.ui.getCore().byId("rdb1");
			var rdb2 = sap.ui.getCore().byId("rdb2");
			var rdb3 = sap.ui.getCore().byId("rdb3");
			var rdb4 = sap.ui.getCore().byId("rdb4");
			var rdb5 = sap.ui.getCore().byId("rdb5");
			var lblreasonerrmsg = sap.ui.getCore().byId("lblreasonerrmsg");

			if (txtComment.getValue().length > 2000) {
				MessageBox.error("Comments should be less than 2000 Characters");
				return false;
			}
			if (rdb1.getSelected() || rdb2.getSelected() || rdb3.getSelected() || rdb4.getSelected() || rdb5.getSelected()) {
				lblreasonerrmsg.setVisible(false);
				if (rdb4.getSelected() && txtPromocode.getSelectedKey() === "") {
					txtPromocode.setValueState("Error");
					lblPromocodeMsg.setVisible(true);
					return;
				} else {
					txtPromocode.setValueState("None");
					lblPromocodeMsg.setVisible(false);
				}
			} else {
				lblreasonerrmsg.setVisible(true);
				rdb1.setValueState("Error");
				rdb2.setValueState("Error");
				rdb3.setValueState("Error");
				rdb4.setValueState("Error");
				rdb5.setValueState("Error");
				// return;
			}

			var PromocodeFlag = false;
			if (txtPromocode.getSelectedKey() !== "") {
				for (var m = 0; m < oModelPromo.getData().length; m++) {
					if (txtPromocode.getSelectedKey() === oModelPromo.getData()[m].PROMO_CODE__C) {
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

			for (var i = 0; i < editPriceData.length; i++) {

				editPriceData[i].BILLING_PRICE_ROLL__C = typeof (editPriceData[i].BILLING_PRICE_ROLL__C) === "string" ? editPriceData[i].BILLING_PRICE_ROLL__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[i].BILLING_PRICE_ROLL__C.split("$ ")[1]) : parseFloat(editPriceData[i].BILLING_PRICE_ROLL__C) :
					editPriceData[i].BILLING_PRICE_ROLL__C;

				editPriceData[i].BILLING_PRICE_CUT__C = typeof (editPriceData[i].BILLING_PRICE_CUT__C) === "string" ? editPriceData[i].BILLING_PRICE_CUT__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[i].BILLING_PRICE_CUT__C.split("$ ")[1]) : parseFloat(editPriceData[i].BILLING_PRICE_CUT__C) :
					editPriceData[i].BILLING_PRICE_CUT__C;
				editPriceData[i].BILLING_PRICE__C = typeof (editPriceData[i].BILLING_PRICE__C) === "string" ? editPriceData[i].BILLING_PRICE__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[i].BILLING_PRICE__C.split("$ ")[1]) : parseFloat(editPriceData[i].BILLING_PRICE__C) :
					editPriceData[i].BILLING_PRICE__C;

				editPriceData[i].DM_ROLL_PRICE__C = parseFloat(editPriceData[i].DM_ROLL_PRICE__C, 10);
				editPriceData[i].DM_CUT_PRICE__C = parseFloat(editPriceData[i].DM_CUT_PRICE__C, 10);
				editPriceData[i].DM_PRICE__C = parseFloat(editPriceData[i].DM_PRICE__C, 10);
				editPriceData[i].RVP_ROLL_PRICE__C = parseFloat(editPriceData[i].RVP_ROLL_PRICE__C, 10);
				editPriceData[i].RVP_CUT_PRICE__C = parseFloat(editPriceData[i].RVP_CUT_PRICE__C, 10);
				editPriceData[i].RVP_PRICE__C = parseFloat(editPriceData[i].RVP_PRICE__C, 10);

				editPriceData[i].EditCartonPrice = typeof (editPriceData[i].BILLING_PRICE__C) === "string" ? editPriceData[i].BILLING_PRICE__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[i].BILLING_PRICE__C.split("$ ")[1]) : parseFloat(editPriceData[i].BILLING_PRICE__C) :
					editPriceData[i].BILLING_PRICE__C;

				editPriceData[i].EditEachPrice = typeof (editPriceData[i].BILLING_PRICE__C) === "string" ? editPriceData[i].BILLING_PRICE__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[i].BILLING_PRICE__C.split("$ ")[1]) : parseFloat(editPriceData[i].BILLING_PRICE__C) :
					editPriceData[i].BILLING_PRICE__C;
				//Added by <JAYANT PRAKASH> for <2269>	
				editPriceData[0].EditSqYdPrice = typeof (editPriceData[0].BILLING_PRICE__C) === "string" ? editPriceData[0].BILLING_PRICE__C
					.split("$ ").length > 0 ? parseFloat(editPriceData[0].BILLING_PRICE__C.split("$ ")[1]) : parseFloat(editPriceData[0].BILLING_PRICE__C) :
					editPriceData[0].BILLING_PRICE__C;
				//Added by <JAYANT PRAKASH> for <2269>	

				editPriceData[i].EditRollPrice = parseFloat(editPriceData[i].BILLING_PRICE_ROLL__C, 10);
				editPriceData[i].EditCutPrice = parseFloat(editPriceData[i].BILLING_PRICE_CUT__C, 10);

				if (editPriceData[i].EditCutPrice === null || editPriceData[i].EditCutPrice === undefined) {
					editPriceData[i].EditCutPrice = 0;

				} else {
					editPriceData[i].EditCutPrice = editPriceData[i].EditCutPrice;
				}
				if (editPriceData[i].CORPORATE_CUT_PALLET_DOLLAR__C === null || editPriceData[i].CORPORATE_CUT_PALLET_DOLLAR__C === undefined) {
					editPriceData[i].CORPORATE_CUT_PALLET_DOLLAR__C = 0;

				} else {
					editPriceData[i].CORPORATE_CUT_PALLET_DOLLAR__C = editPriceData[i].CORPORATE_CUT_PALLET_DOLLAR__C;
				}
				if (editPriceData[i].CORPORATE_CUT_PALLET_PERCENT__C === null || editPriceData[i].CORPORATE_CUT_PALLET_PERCENT__C === undefined) {
					editPriceData[i].CORPORATE_CUT_PALLET_PERCENT__C = 0;

				} else {
					editPriceData[i].CORPORATE_CUT_PALLET_PERCENT__C = editPriceData[i].CORPORATE_CUT_PALLET_PERCENT__C;
				}

				if (editPriceData[i].EditRollPrice === null || editPriceData[i].EditRollPrice === undefined) {
					editPriceData[i].EditRollPrice = 0;

				} else {
					editPriceData[i].EditRollPrice = editPriceData[i].EditRollPrice;
				}
				if (editPriceData[i].CORPORATE_ROLL_CARTON_DOLLAR__C === null || editPriceData[i].CORPORATE_ROLL_CARTON_DOLLAR__C === undefined) {
					editPriceData[i].CORPORATE_ROLL_CARTON_DOLLAR__C = 0;

				} else {
					editPriceData[i].CORPORATE_ROLL_CARTON_DOLLAR__C = editPriceData[i].CORPORATE_ROLL_CARTON_DOLLAR__C;
				}
				if (editPriceData[i].CORPORATE_ROLL_CARTON_PERCENT__C === null || editPriceData[i].CORPORATE_ROLL_CARTON_PERCENT__C === undefined) {
					editPriceData[i].CORPORATE_ROLL_CARTON_PERCENT__C = 0;

				} else {
					editPriceData[i].CORPORATE_ROLL_CARTON_PERCENT__C = editPriceData[i].CORPORATE_ROLL_CARTON_PERCENT__C;
				}

				if (editPriceData[i].NON_CORPORATE_CUT_PALLET_DOLLAR__C === null || editPriceData[i].NON_CORPORATE_CUT_PALLET_DOLLAR__C ===
					undefined) {
					editPriceData[i].NON_CORPORATE_CUT_PALLET_DOLLAR__C = 0;

				} else {
					editPriceData[i].NON_CORPORATE_CUT_PALLET_DOLLAR__C = editPriceData[i].NON_CORPORATE_CUT_PALLET_DOLLAR__C;
				}
				if (editPriceData[i].NON_CORPORATE_CUT_PALLET_PERCENT__C === null || editPriceData[i].NON_CORPORATE_CUT_PALLET_PERCENT__C ===
					undefined) {
					editPriceData[i].NON_CORPORATE_CUT_PALLET_PERCENT__C = 0;

				} else {
					editPriceData[i].NON_CORPORATE_CUT_PALLET_PERCENT__C = editPriceData[i].NON_CORPORATE_CUT_PALLET_PERCENT__C;
				}
				if (editPriceData[i].NON_CORPORATE_ROLL_CARTON_DOLLAR__C === null || editPriceData[i].NON_CORPORATE_ROLL_CARTON_DOLLAR__C ===
					undefined) {
					editPriceData[i].NON_CORPORATE_ROLL_CARTON_DOLLAR__C = 0;

				} else {
					editPriceData[i].NON_CORPORATE_ROLL_CARTON_DOLLAR__C = editPriceData[i].NON_CORPORATE_ROLL_CARTON_DOLLAR__C;
				}
				if (editPriceData[i].NON_CORPORATE_ROLL_CARTON_PERCENT__C === null || editPriceData[i].NON_CORPORATE_ROLL_CARTON_PERCENT__C ===
					undefined) {
					editPriceData[i].NON_CORPORATE_ROLL_CARTON_PERCENT__C = 0;

				} else {
					editPriceData[i].NON_CORPORATE_ROLL_CARTON_PERCENT__C = editPriceData[i].NON_CORPORATE_ROLL_CARTON_PERCENT__C;
				}

				if (editPriceData[i].EditCartonPrice === null || editPriceData[i].EditCartonPrice === undefined) {
					editPriceData[i].EditCartonPrice = 0;

				} else {
					editPriceData[i].EditCartonPrice = editPriceData[i].EditCartonPrice;
				}
				//Added by <JAYANT PRAKASH> for <2269>
				if (editPriceData.EditSqYdPrice === null || editPriceData.EditSqYdPrice === undefined) {
					editPriceData.EditSqYdPrice = 0;

				} else {
					editPriceData.EditSqYdPrice = editPriceData.EditSqYdPrice;
				}
				//Added by <JAYANT PRAKASH> for <2269>
			}

			// 			var editPriceData = this.getView().getModel("editModel").getData()[0];

			var updateUrl = "";
			var payload = ""
				// 			var reqNetPriceCut = [];
				// 			var reqNetPriceRoll = [];
				// 			var reqNetPriceAcc = [];
			var justification = "";
			// 			var reqNetPriceCarton = [];
			var reqPriceCut = [];
			var reqPriceRoll = [];
			var reqPriceCarton = [];
			var reqPriceSqYd = []; //Added by <JAYANT PRAKASH> for <2269>

			if (rdb1.getSelected()) {
				justification = "1";
			} else if (rdb2.getSelected()) {
				justification = "2";
			} else if (rdb3.getSelected()) {
				justification = "3";
			} else if (rdb4.getSelected()) {
				justification = "4";
			} else if (rdb5.getSelected()) {
				justification = "5";
			} else {
				justification = "";
			}

			//changes for Sorting by Blue color 
			// 			for(var i=0; i< editPriceData.length; i++) {

			// 			if (editPriceData[i].BILLING_PRICE_ROLL__C) {
			// 				if (editPriceData[i].BUYING_GROUP_NUMBER__C !== null) {
			// 					reqNetPriceCut[i] = parseFloat(editPriceData[i].EditCutPrice) - (parseFloat(editPriceData[i].CORPORATE_CUT_PALLET_DOLLAR__C) +
			// 						parseFloat(editPriceData[i].EditCutPrice) * parseFloat(editPriceData[i].CORPORATE_CUT_PALLET_PERCENT__C) / 100);

			// 					reqNetPriceRoll[i] = parseFloat(editPriceData[i].EditRollPrice) - (parseFloat(editPriceData[i].CORPORATE_ROLL_CARTON_DOLLAR__C) +
			// 						parseFloat(editPriceData[i].EditRollPrice) * parseFloat(editPriceData[i].CORPORATE_ROLL_CARTON_PERCENT__C) / 100);

			// 				} else {
			// 					reqNetPriceCut[i] = parseFloat(editPriceData[i].EditCutPrice) - (parseFloat(editPriceData[i].NON_CORPORATE_CUT_PALLET_DOLLAR__C) +
			// 						parseFloat(editPriceData[i].EditCutPrice) * parseFloat(editPriceData[i].NON_CORPORATE_CUT_PALLET_PERCENT__C) / 100);

			// 					reqNetPriceRoll[i] = parseFloat(editPriceData[i].EditRollPrice) - (parseFloat(editPriceData[i].NON_CORPORATE_ROLL_CARTON_DOLLAR__C) +
			// 						parseFloat(editPriceData[i].EditRollPrice) * parseFloat(editPriceData[i].NON_CORPORATE_ROLL_CARTON_PERCENT__C) / 100);

			// 				}

			// 				if (reqNetPriceCut[i] === "") {
			// 					reqNetPriceCut[i] = 0;
			// 				} else {
			// 					reqNetPriceCut[i] = parseFloat(reqNetPriceCut[i]);
			// 				}

			// 				if (reqNetPriceRoll[i] === "") {
			// 					reqNetPriceRoll[i] = 0;
			// 				} else {
			// 					reqNetPriceRoll[i] = parseFloat(reqNetPriceRoll[i]);
			// 				}

			// 			}

			// 			if (editPriceData[i].BILLING_PRICE__C) {
			// 				if (editPriceData[i].BUYING_GROUP_NUMBER__C !== null) {

			// 					reqNetPriceAcc[i] = parseFloat(editPriceData[i].EditEachPrice) - (parseFloat(editPriceData[i].CORPORATE_ROLL_CARTON_DOLLAR__C) +
			// 						parseFloat(editPriceData[i].EditEachPrice) * parseFloat(editPriceData[i].CORPORATE_ROLL_CARTON_PERCENT__C) / 100);

			// 					reqNetPriceCarton[i] = parseFloat(editPriceData[i].EditCartonPrice) - (parseFloat(editPriceData[i].CORPORATE_ROLL_CARTON_DOLLAR__C) +
			// 						parseFloat(editPriceData[i].EditCartonPrice) * parseFloat(editPriceData[i].CORPORATE_ROLL_CARTON_PERCENT__C) / 100);

			// 				} else {

			// 					reqNetPriceAcc[i] = parseFloat(editPriceData[i].EditEachPrice) - (parseFloat(editPriceData[i].NON_CORPORATE_ROLL_CARTON_DOLLAR__C) +
			// 						parseFloat(editPriceData[i].EditEachPrice) * parseFloat(editPriceData[i].NON_CORPORATE_ROLL_CARTON_PERCENT__C) / 100);

			// 					reqNetPriceCarton[i] = parseFloat(editPriceData[i].EditCartonPrice) - (parseFloat(editPriceData[i].NON_CORPORATE_ROLL_CARTON_DOLLAR__C) +
			// 						parseFloat(editPriceData[i].EditCartonPrice) * parseFloat(editPriceData[i].NON_CORPORATE_ROLL_CARTON_PERCENT__C) / 100);
			// 				}

			// 				if (reqNetPriceAcc[i] === "") {
			// 					reqNetPriceAcc[i] = 0;
			// 				} else {
			// 					reqNetPriceAcc[i] = parseFloat(reqNetPriceAcc[i]);
			// 				}
			// 				if (reqNetPriceCarton[i] === "") {
			// 					reqNetPriceCarton[i] = 0;
			// 				} else {
			// 					reqNetPriceCarton[i] = parseFloat(reqNetPriceCarton[i]);
			// 				}

			// 			}
			// 			}

			var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});

			// var startDate = editPriceData[0].EDIT_START_DATE;
			// var endDate = editPriceData[0].EDIT_END_DATE;

			var dpkStartdate = dateFormat.format(new Date(this.dpkStartdate));
			var dpkEnddate = dateFormat.format(new Date(this.dpkEnddate));

			// var cplRecordId = new Date().getTime().toString();

			var newPrice = this.newPrice.split("$")[1];
			var sign = this.newPrice.split("$")[0];

			// 		    function priceChange(level, sign) {

			// 		    }

			if (this.selectedMELevel === "TM1") {
				if (sign === "+") {
					for (var i = 0; i < editPriceData.length; i++) {
						reqPriceCut[i] = parseFloat(editPriceData[i].TM1_CUT_PRICE__C) + parseFloat(newPrice);
						reqPriceRoll[i] = parseFloat(editPriceData[i].TM1_ROLL_PRICE__C) + parseFloat(newPrice);
					}
				} else {
					for (var i = 0; i < editPriceData.length; i++) {
						reqPriceCut[i] = parseFloat(editPriceData[i].TM1_CUT_PRICE__C) - parseFloat(newPrice);
						reqPriceRoll[i] = parseFloat(editPriceData[i].TM1_ROLL_PRICE__C) - parseFloat(newPrice);
					}
				}
			} else if (this.selectedMELevel === "TM2") {
				if (sign === "+") {
					for (var i = 0; i < editPriceData.length; i++) {
						reqPriceCut[i] = parseFloat(editPriceData[i].TM2_CUT_PRICE__C) + parseFloat(newPrice);
						reqPriceRoll[i] = parseFloat(editPriceData[i].TM2_ROLL_PRICE__C) + parseFloat(newPrice);
					}
				} else {
					for (var i = 0; i < editPriceData.length; i++) {
						reqPriceCut[i] = parseFloat(editPriceData[i].TM2_CUT_PRICE__C) - parseFloat(newPrice);
						reqPriceRoll[i] = parseFloat(editPriceData[i].TM2_ROLL_PRICE__C) - parseFloat(newPrice);
					}
				}
			} else if (this.selectedMELevel === "TM3") {
				if (sign === "+") {
					for (var i = 0; i < editPriceData.length; i++) {
						reqPriceCut[i] = parseFloat(editPriceData[i].TM3_CUT_PRICE__C) + parseFloat(newPrice);
						reqPriceRoll[i] = parseFloat(editPriceData[i].TM3_ROLL_PRICE__C) + parseFloat(newPrice);
					}
				} else {
					for (var i = 0; i < editPriceData.length; i++) {
						reqPriceCut[i] = parseFloat(editPriceData[i].TM3_CUT_PRICE__C) - parseFloat(newPrice);
						reqPriceRoll[i] = parseFloat(editPriceData[i].TM3_ROLL_PRICE__C) - parseFloat(newPrice);
					}
				}
			} else if (this.selectedMELevel === "DM") {
				if (sign === "+") {
					for (var i = 0; i < editPriceData.length; i++) {
						reqPriceCut[i] = parseFloat(editPriceData[i].DM_CUT_PRICE__C) + parseFloat(newPrice);
						reqPriceRoll[i] = parseFloat(editPriceData[i].DM_ROLL_PRICE__C) + parseFloat(newPrice);
					}
				} else {
					for (var i = 0; i < editPriceData.length; i++) {
						reqPriceCut[i] = parseFloat(editPriceData[i].DM_CUT_PRICE__C) - parseFloat(newPrice);
						reqPriceRoll[i] = parseFloat(editPriceData[i].DM_ROLL_PRICE__C) - parseFloat(newPrice);
					}
				}
			} else if (this.selectedMELevel === "RVP") {
				if (sign === "+") {
					for (var i = 0; i < editPriceData.length; i++) {
						reqPriceCut[i] = parseFloat(editPriceData[i].RVP_CUT_PRICE__C) + parseFloat(newPrice);
						reqPriceRoll[i] = parseFloat(editPriceData[i].RVP_ROLL_PRICE__C) + parseFloat(newPrice);
					}
				} else {
					for (var i = 0; i < editPriceData.length; i++) {
						reqPriceCut[i] = parseFloat(editPriceData[i].RVP_CUT_PRICE__C) - parseFloat(newPrice);
						reqPriceRoll[i] = parseFloat(editPriceData[i].RVP_ROLL_PRICE__C) - parseFloat(newPrice);
					}
				}
			}

			/*var txtCut1 = txtCut1.getText();
			var txtRoll1 = txtRoll1.getText();
			var txtEach11 = txtEach11.getText();
			var txtCarton11 = txtCarton11.getText();*/

			/*that.txtCut1 = that.txtCut1 !== null ? that.txtCut1 : 0;
			that.txtRoll1 = that.txtRoll1 !== null ? that.txtRoll1 : 0;
			reqNetPriceCut = reqNetPriceCut !== null ? reqNetPriceCut : 0;
			reqNetPriceRoll = reqNetPriceRoll !== null ? reqNetPriceRoll : 0;
			that.txtCarton11 = that.txtCarton11 !== null ? that.txtCarton11 : 0;
			reqNetPriceCarton = reqNetPriceCarton !== null ? reqNetPriceCarton : 0;
			that.txtEach11 = that.txtEach11 !== null ? that.txtEach11 : 0;
			reqNetPriceAcc = reqNetPriceAcc !== null ? reqNetPriceAcc : 0;*/

			//Added by <JAYANT PRAKASH> for <2269>
			if (this.selectedCat === "Cushion") {
				if (this.selectedMELevel === "TM") {
					for (var i = 0; i < editPriceData.length; i++) {
						reqPriceSqYd[i] = parseFloat(editPriceData[i].TM_1_TO_24_PRICE__C) + parseFloat(newPrice);
					}

				} else {
					for (var i = 0; i < editPriceData.length; i++) {
						reqPriceSqYd[i] = parseFloat(editPriceData[i].TM_1_TO_24_PRICE__C) - parseFloat(newPrice);
					}

				}

				if (this.selectedMELevel === "DM") {
					for (var i = 0; i < editPriceData.length; i++) {
						reqPriceSqYd[i] = parseFloat(editPriceData[i].DM_1_TO_24_PRICE__C) + parseFloat(newPrice);
					}

				} else {
					for (var i = 0; i < editPriceData.length; i++) {
						reqPriceSqYd[i] = parseFloat(editPriceData[i].DM_1_TO_24_PRICE__C) - parseFloat(newPrice);
					}

				}
				if (this.selectedMELevel === "RVP") {
					for (var i = 0; i < editPriceData.length; i++) {
						reqPriceSqYd[i] = parseFloat(editPriceData[i].RVP_1_TO_24_PRICE__C) + parseFloat(newPrice);
					}

				} else {
					for (var i = 0; i < editPriceData.length; i++) {
						reqPriceSqYd[i] = parseFloat(editPriceData[i].RVP_1_TO_24_PRICE__C) - parseFloat(newPrice);
					}

				}
			}
			//Added by <JAYANT PRAKASH> for <2269>

			if (this.multiEditType === "Edit Current Prices") {

				if (this.selectedCat === "Residential Broadloom" || this.selectedCat === "Commercial Broadloom" || this.selectedCat ===
					"Resilient Sheet") {
					updateUrl = "pricing/MultiUpdatecplhardsurface.xsjs";
					var payload = [];
					for (var i = 0; i < editPriceData.length; i++) {
						var cplRecordId = new Date().getTime().toString() + (Math.floor(Math.random() * (100000 - 9999)) + 9999);
						if (editPriceData[i].EDIT_START_DATE.split("(").length > 1) {
							var startDate = editPriceData[i].EDIT_START_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_START_DATE = dateFormat.format(new Date(parseInt(startDate)));
						}
						if (editPriceData[i].EDIT_END_DATE.split("(").length > 1) {
							var endDate = editPriceData[i].EDIT_END_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_END_DATE = dateFormat.format(new Date(parseInt(endDate)));
						}
						var data = {
							"Stylenumber": editPriceData[i].SELLING_STYLE_NUM__C,
							"Accountno": editPriceData[i].ACCOUNT__C,
							"Productcategory": this.selectedCat,
							"Productuniquekey": editPriceData[i].PRODUCT_UNIQUE_KEY__C,
							"Whcode": this.selectedWH,
							"Cplpriceid": editPriceData[i].CPL_PRICE_ID__C,
							"Startdate": editPriceData[i].EDIT_START_DATE,
							"Enddate": editPriceData[i].EDIT_END_DATE,
							"Cplrecordid": cplRecordId,
							"Approvalstatus": "1",
							"Justification": justification,
							"Promocode": "",
							"Modifiedby": that.loggedInUser,
							"Reqbillpricecut": reqPriceCut[i],
							"Reqbillpriceroll": reqPriceRoll[i],
							"Reqnetpricecut": reqPriceCut[i],
							"Reqnetpriceroll": reqPriceRoll[i]
						};
						payload.push(data);
					}
				} else if (this.selectedCat === "Carpet Tile" || this.selectedCat === "Tile" || this.selectedCat === "TecWood" || this.selectedCat ===
					"SolidWood" || this.selectedCat === "RevWood" || this.selectedCat === "Resilient Tile") {
					updateUrl = "pricing/MultiUpdatecplsoftsurface.xsjs";

					var payload = [];
					for (var i = 0; i < editPriceData.length; i++) {
						var cplRecordId = new Date().getTime().toString() + (Math.floor(Math.random() * (100000 - 9999)) + 9999);
						if (editPriceData[i].EDIT_START_DATE.split("(").length > 1) {
							var startDate = editPriceData[i].EDIT_START_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_START_DATE = dateFormat.format(new Date(parseInt(startDate)));
						}
						if (editPriceData[i].EDIT_END_DATE.split("(").length > 1) {
							var endDate = editPriceData[i].EDIT_END_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_END_DATE = dateFormat.format(new Date(parseInt(endDate)));
						}
						var data = {
							"Stylenumber": editPriceData[i].SELLING_STYLE_NUM__C,
							"Accountno": editPriceData[i].ACCOUNT__C,
							"Productcategory": this.selectedCat,
							"Productuniquekey": editPriceData[i].PRODUCT_UNIQUE_KEY__C,
							"Whcode": this.selectedWH,
							"Cplpriceid": editPriceData[i].CPL_PRICE_ID__C,
							"Startdate": editPriceData[i].EDIT_START_DATE,
							"Enddate": editPriceData[i].EDIT_END_DATE,
							"Cplrecordid": cplRecordId,
							"Approvalstatus": "1",
							"Justification": justification,
							"Promocode": "",
							"Modifiedby": that.loggedInUser,
							"Reqbillpricecarton": reqPriceCut[i],
							"Reqbillpricepallet": reqPriceRoll[i],
							"Reqnetpricecarton": reqPriceCut[i],
							"Reqnetpricepallet": reqPriceRoll[i]
						};
						payload.push(data);

					}

				} else if (this.selectedCat === "Accessories") {
					updateUrl = "pricing/MultiUpdatecplaccessories.xsjs";
					var payload = [];
					for (var i = 0; i < editPriceData.length; i++) {
						var cplRecordId = new Date().getTime().toString() + (Math.floor(Math.random() * (100000 - 9999)) + 9999);
						if (editPriceData[i].EDIT_START_DATE.split("(").length > 1) {
							var startDate = editPriceData[i].EDIT_START_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_START_DATE = dateFormat.format(new Date(parseInt(startDate)));
						}
						if (editPriceData[i].EDIT_END_DATE.split("(").length > 1) {
							var endDate = editPriceData[i].EDIT_END_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_END_DATE = dateFormat.format(new Date(parseInt(endDate)));
						}
						var data = {
							"Stylenumber": editPriceData[i].SELLING_STYLE_NUM__C,
							"Accountno": editPriceData[i].ACCOUNT__C,
							"Productcategory": this.selectedCat,
							"Productuniquekey": editPriceData[i].PRODUCT_UNIQUE_KEY__C,
							"Whcode": this.selectedWH,
							"Cplpriceid": editPriceData[i].CPL_PRICE_ID__C,
							"Startdate": editPriceData[i].EDIT_START_DATE,
							"Enddate": editPriceData[i].EDIT_END_DATE,
							"Cplrecordid": cplRecordId,
							"Approvalstatus": "1",
							"Justification": justification,
							"Promocode": "",
							"Modifiedby": that.loggedInUser,
							"Reqbillprice": reqPriceCut[i],
							"Reqnetprice": reqPriceRoll[i]
						};
						payload.push(data);

					}
				}
				//Added by <JAYANT PRAKASH> for <2269>
				else if (this.selectedCat === "Cushion") {
					updateUrl = "pricing/MultiUpdatecplcushion.xsjs";
					var payload = [];
					for (var i = 0; i < editPriceData.length; i++) {
						var cplRecordId = new Date().getTime().toString() + (Math.floor(Math.random() * (100000 - 9999)) + 9999);
						if (editPriceData[i].EDIT_START_DATE.split("(").length > 1) {
							var startDate = editPriceData[i].EDIT_START_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_START_DATE = dateFormat.format(new Date(parseInt(startDate)));
						}
						if (editPriceData[i].EDIT_END_DATE.split("(").length > 1) {
							var endDate = editPriceData[i].EDIT_END_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_END_DATE = dateFormat.format(new Date(parseInt(endDate)));
						}
						var data = {
							"Stylenumber": editPriceData[i].SELLING_STYLE_NUM__C,
							"Accountno": editPriceData[i].ACCOUNT__C,
							"Productcategory": this.selectedCat,
							"Productuniquekey": editPriceData[i].PRODUCT_UNIQUE_KEY__C,
							"Whcode": this.selectedWH,
							"Cplpriceid": editPriceData[i].CPL_PRICE_ID__C,
							"Startdate": editPriceData[i].EDIT_START_DATE,
							"Enddate": editPriceData[i].EDIT_END_DATE,
							"Cplrecordid": cplRecordId,
							"Approvalstatus": "1",
							"Justification": justification,
							"Promocode": "",
							"Modifiedby": that.loggedInUser,
							"Reqbillprice": reqPriceSqYd[i],
							"Reqnetprice": reqPriceSqYd[i]
						};
						payload.push(data);

					}
				}
				//Added by <JAYANT PRAKASH> for <2269>
			} else if (this.multiEditType === "Create Limited Time Prices") {

				if (this.selectedCat === "Residential Broadloom") {
					updateUrl = "pricing/MultiInsertLimitedRB.xsjs";
					var payload = [];
					for (var i = 0; i < editPriceData.length; i++) {
						var cplRecordId = new Date().getTime().toString() + (Math.floor(Math.random() * (100000 - 9999)) + 9999);
						if (editPriceData[i].EDIT_START_DATE.split("(").length > 1) {
							var startDate = editPriceData[i].EDIT_START_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_START_DATE = dateFormat.format(new Date(parseInt(startDate)));
						}
						if (editPriceData[i].EDIT_END_DATE.split("(").length > 1) {
							var endDate = editPriceData[i].EDIT_END_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_END_DATE = dateFormat.format(new Date(parseInt(endDate)));
						}
						var data = {
							"Stylenumber": editPriceData[i].SELLING_STYLE_NUM__C,
							"Accountno": editPriceData[i].ACCOUNT__C,
							"Productuniquekey": editPriceData[i].PRODUCT_UNIQUE_KEY__C,
							"Whcode": this.selectedWH,
							"Cplpriceid": editPriceData[i].CPL_PRICE_ID__C,
							"Startdate": editPriceData[i].EDIT_START_DATE,
							"Enddate": editPriceData[i].EDIT_END_DATE,
							"Newstartdate": dpkStartdate,
							"Newenddate": dpkEnddate,
							"Cplrecordid": cplRecordId,
							"Approvalstatus": "1",
							"Justification": justification,
							"Promocode": "",
							"Modifiedby": that.loggedInUser,
							"Reqbillpricecut": reqPriceCut[i],
							"Reqbillpriceroll": reqPriceRoll[i],
							"Reqnetpricecut": reqPriceCut[i],
							"Reqnetpriceroll": reqPriceRoll[i]
						};
						payload.push(data);
					}
				} else if (this.selectedCat === "Commercial Broadloom") {
					updateUrl = "pricing/MultiInsertLimitedCB.xsjs";
					var payload = [];
					for (var i = 0; i < editPriceData.length; i++) {
						var cplRecordId = new Date().getTime().toString() + (Math.floor(Math.random() * (100000 - 9999)) + 9999);
						if (editPriceData[i].EDIT_START_DATE.split("(").length > 1) {
							var startDate = editPriceData[i].EDIT_START_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_START_DATE = dateFormat.format(new Date(parseInt(startDate)));
						}
						if (editPriceData[i].EDIT_END_DATE.split("(").length > 1) {
							var endDate = editPriceData[i].EDIT_END_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_END_DATE = dateFormat.format(new Date(parseInt(endDate)));
						}
						var data = {
							"Stylenumber": editPriceData[i].SELLING_STYLE_NUM__C,
							"Accountno": editPriceData[i].ACCOUNT__C,
							"Productuniquekey": editPriceData[i].PRODUCT_UNIQUE_KEY__C,
							"Whcode": this.selectedWH,
							"Cplpriceid": editPriceData[i].CPL_PRICE_ID__C,
							"Startdate": editPriceData[i].EDIT_START_DATE,
							"Enddate": editPriceData[i].EDIT_END_DATE,
							"Newstartdate": dpkStartdate,
							"Newenddate": dpkEnddate,
							"Cplrecordid": cplRecordId,
							"Approvalstatus": "1",
							"Justification": justification,
							"Promocode": "",
							"Modifiedby": that.loggedInUser,
							"Reqbillpricecut": reqPriceCut[i],
							"Reqbillpriceroll": reqPriceRoll[i],
							"Reqnetpricecut": reqPriceCut[i],
							"Reqnetpriceroll": reqPriceRoll[i]
						};
						payload.push(data);
					}
				} else if (this.selectedCat === "Resilient Sheet") {
					updateUrl = "pricing/MultiInsertLimitedRT.xsjs";
					var payload = [];
					for (var i = 0; i < editPriceData.length; i++) {
						var cplRecordId = new Date().getTime().toString() + (Math.floor(Math.random() * (100000 - 9999)) + 9999);
						if (editPriceData[i].EDIT_START_DATE.split("(").length > 1) {
							var startDate = editPriceData[i].EDIT_START_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_START_DATE = dateFormat.format(new Date(parseInt(startDate)));
						}
						if (editPriceData[i].EDIT_END_DATE.split("(").length > 1) {
							var endDate = editPriceData[i].EDIT_END_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_END_DATE = dateFormat.format(new Date(parseInt(endDate)));
						}
						var data = {
							"Stylenumber": editPriceData[i].SELLING_STYLE_NUM__C,
							"Accountno": editPriceData[i].ACCOUNT__C,
							"Productuniquekey": editPriceData[i].PRODUCT_UNIQUE_KEY__C,
							"Whcode": this.selectedWH,
							"Cplpriceid": editPriceData[i].CPL_PRICE_ID__C,
							"Startdate": editPriceData[i].EDIT_START_DATE,
							"Enddate": editPriceData[i].EDIT_END_DATE,
							"Newstartdate": dpkStartdate,
							"Newenddate": dpkEnddate,
							"Cplrecordid": cplRecordId,
							"Approvalstatus": "1",
							"Justification": justification,
							"Promocode": "",
							"Modifiedby": that.loggedInUser,
							"Reqbillpricecut": reqPriceCut[i],
							"Reqbillpriceroll": reqPriceRoll[i],
							"Reqnetpricecut": reqPriceCut[i],
							"Reqnetpriceroll": reqPriceRoll[i]
						};
						payload.push(data);
					}
				} else if (this.selectedCat === "Accessories") {
					updateUrl = "pricing/MultiInsertLimitedACC.xsjs";
					var payload = [];
					for (var i = 0; i < editPriceData.length; i++) {
						var cplRecordId = new Date().getTime().toString() + (Math.floor(Math.random() * (100000 - 9999)) + 9999);
						if (editPriceData[i].EDIT_START_DATE.split("(").length > 1) {
							var startDate = editPriceData[i].EDIT_START_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_START_DATE = dateFormat.format(new Date(parseInt(startDate)));
						}
						if (editPriceData[i].EDIT_END_DATE.split("(").length > 1) {
							var endDate = editPriceData[i].EDIT_END_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_END_DATE = dateFormat.format(new Date(parseInt(endDate)));
						}
						var data = {
							"Stylenumber": editPriceData[i].SELLING_STYLE_NUM__C,
							"Accountno": editPriceData[i].ACCOUNT__C,
							"Productuniquekey": editPriceData[i].PRODUCT_UNIQUE_KEY__C,
							"Whcode": this.selectedWH,
							"Cplpriceid": editPriceData[i].CPL_PRICE_ID__C,
							"Startdate": editPriceData[i].EDIT_START_DATE,
							"Enddate": editPriceData[i].EDIT_END_DATE,
							"Newstartdate": dpkStartdate,
							"Newenddate": dpkEnddate,
							"Cplrecordid": cplRecordId,
							"Approvalstatus": "1",
							"Justification": justification,
							"Promocode": "",
							"Modifiedby": that.loggedInUser,
							"Reqbillprice": reqPriceCut[i],
							"Reqnetprice": reqPriceRoll[i]
						};
						payload.push(data);

					}
				} else if (this.selectedCat === "Carpet Tile") {
					updateUrl = "pricing/MultiInsertLimitedCT.xsjs";
					var payload = [];
					for (var i = 0; i < editPriceData.length; i++) {
						var cplRecordId = new Date().getTime().toString() + (Math.floor(Math.random() * (100000 - 9999)) + 9999);
						if (editPriceData[i].EDIT_START_DATE.split("(").length > 1) {
							var startDate = editPriceData[i].EDIT_START_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_START_DATE = dateFormat.format(new Date(parseInt(startDate)));
						}
						if (editPriceData[i].EDIT_END_DATE.split("(").length > 1) {
							var endDate = editPriceData[i].EDIT_END_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_END_DATE = dateFormat.format(new Date(parseInt(endDate)));
						}
						var data = {
							"Stylenumber": editPriceData[i].SELLING_STYLE_NUM__C,
							"Accountno": editPriceData[i].ACCOUNT__C,
							"Productuniquekey": editPriceData[i].PRODUCT_UNIQUE_KEY__C,
							"Whcode": this.selectedWH,
							"Cplpriceid": editPriceData[i].CPL_PRICE_ID__C,
							"Startdate": editPriceData[i].EDIT_START_DATE,
							"Enddate": editPriceData[i].EDIT_END_DATE,
							"Newstartdate": dpkStartdate,
							"Newenddate": dpkEnddate,
							"Cplrecordid": cplRecordId,
							"Approvalstatus": "1",
							"Justification": justification,
							"Promocode": txtPromocode.getSelectedKey(),
							"Modifiedby": that.loggedInUser,
							"Reqbillpricecarton": reqPriceCut[i],
							"Reqbillpricepallet": reqPriceRoll[i],
							"Reqnetpricecarton": reqPriceCut[i],
							"Reqnetpricepallet": reqPriceRoll[i]
						};
						payload.push(data);
					}
				} else if (this.selectedCat === "Tile") {
					updateUrl = "pricing/MultiInsertLimitedTile.xsjs";
					var payload = [];
					for (var i = 0; i < editPriceData.length; i++) {
						var cplRecordId = new Date().getTime().toString() + (Math.floor(Math.random() * (100000 - 9999)) + 9999);
						if (editPriceData[i].EDIT_START_DATE.split("(").length > 1) {
							var startDate = editPriceData[i].EDIT_START_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_START_DATE = dateFormat.format(new Date(parseInt(startDate)));
						}
						if (editPriceData[i].EDIT_END_DATE.split("(").length > 1) {
							var endDate = editPriceData[i].EDIT_END_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_END_DATE = dateFormat.format(new Date(parseInt(endDate)));
						}
						var data = {
							"Stylenumber": editPriceData[i].SELLING_STYLE_NUM__C,
							"Accountno": editPriceData[i].ACCOUNT__C,
							"Productuniquekey": editPriceData[i].PRODUCT_UNIQUE_KEY__C,
							"Whcode": this.selectedWH,
							"Cplpriceid": editPriceData[i].CPL_PRICE_ID__C,
							"Startdate": editPriceData[i].EDIT_START_DATE,
							"Enddate": editPriceData[i].EDIT_END_DATE,
							"Newstartdate": dpkStartdate,
							"Newenddate": dpkEnddate,
							"Cplrecordid": cplRecordId,
							"Approvalstatus": "1",
							"Justification": justification,
							"Promocode": txtPromocode.getSelectedKey(),
							"Modifiedby": that.loggedInUser,
							"Reqbillpricecarton": reqPriceCut[i],
							"Reqbillpricepallet": reqPriceRoll[i],
							"Reqnetpricecarton": reqPriceCut[i],
							"Reqnetpricepallet": reqPriceRoll[i]
						};
						payload.push(data);
					}
				} else if (this.selectedCat === "TecWood") {
					updateUrl = "pricing/MultiInsertLimitedTW.xsjs";
					var payload = [];
					for (var i = 0; i < editPriceData.length; i++) {
						var cplRecordId = new Date().getTime().toString() + (Math.floor(Math.random() * (100000 - 9999)) + 9999);
						if (editPriceData[i].EDIT_START_DATE.split("(").length > 1) {
							var startDate = editPriceData[i].EDIT_START_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_START_DATE = dateFormat.format(new Date(parseInt(startDate)));
						}
						if (editPriceData[i].EDIT_END_DATE.split("(").length > 1) {
							var endDate = editPriceData[i].EDIT_END_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_END_DATE = dateFormat.format(new Date(parseInt(endDate)));
						}
						var data = {
							"Stylenumber": editPriceData[i].SELLING_STYLE_NUM__C,
							"Accountno": editPriceData[i].ACCOUNT__C,
							"Productuniquekey": editPriceData[i].PRODUCT_UNIQUE_KEY__C,
							"Whcode": this.selectedWH,
							"Cplpriceid": editPriceData[i].CPL_PRICE_ID__C,
							"Startdate": editPriceData[i].EDIT_START_DATE,
							"Enddate": editPriceData[i].EDIT_END_DATE,
							"Newstartdate": dpkStartdate,
							"Newenddate": dpkEnddate,
							"Cplrecordid": cplRecordId,
							"Approvalstatus": "1",
							"Justification": justification,
							"Promocode": txtPromocode.getSelectedKey(),
							"Modifiedby": that.loggedInUser,
							"Reqbillpricecarton": reqPriceCut[i],
							"Reqbillpricepallet": reqPriceRoll[i],
							"Reqnetpricecarton": reqPriceCut[i],
							"Reqnetpricepallet": reqPriceRoll[i]
						};
						payload.push(data);
					}
				} else if (this.selectedCat === "SolidWood") {
					updateUrl = "pricing/MultiInsertLimitedSW.xsjs";
					var payload = [];
					for (var i = 0; i < editPriceData.length; i++) {
						var cplRecordId = new Date().getTime().toString() + (Math.floor(Math.random() * (100000 - 9999)) + 9999);
						if (editPriceData[i].EDIT_START_DATE.split("(").length > 1) {
							var startDate = editPriceData[i].EDIT_START_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_START_DATE = dateFormat.format(new Date(parseInt(startDate)));
						}
						if (editPriceData[i].EDIT_END_DATE.split("(").length > 1) {
							var endDate = editPriceData[i].EDIT_END_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_END_DATE = dateFormat.format(new Date(parseInt(endDate)));
						}
						var data = {
							"Stylenumber": editPriceData[i].SELLING_STYLE_NUM__C,
							"Accountno": editPriceData[i].ACCOUNT__C,
							"Productuniquekey": editPriceData[i].PRODUCT_UNIQUE_KEY__C,
							"Whcode": this.selectedWH,
							"Cplpriceid": editPriceData[i].CPL_PRICE_ID__C,
							"Startdate": editPriceData[i].EDIT_START_DATE,
							"Enddate": editPriceData[i].EDIT_END_DATE,
							"Newstartdate": dpkStartdate,
							"Newenddate": dpkEnddate,
							"Cplrecordid": cplRecordId,
							"Approvalstatus": "1",
							"Justification": justification,
							"Promocode": txtPromocode.getSelectedKey(),
							"Modifiedby": that.loggedInUser,
							"Reqbillpricecarton": reqPriceCut[i],
							"Reqbillpricepallet": reqPriceRoll[i],
							"Reqnetpricecarton": reqPriceCut[i],
							"Reqnetpricepallet": reqPriceRoll[i]
						};
						payload.push(data);
					}
				} else if (this.selectedCat === "RevWood") {
					updateUrl = "pricing/MultiInsertLimitedRW.xsjs";
					var payload = [];
					for (var i = 0; i < editPriceData.length; i++) {
						var cplRecordId = new Date().getTime().toString() + (Math.floor(Math.random() * (100000 - 9999)) + 9999);
						if (editPriceData[i].EDIT_START_DATE.split("(").length > 1) {
							var startDate = editPriceData[i].EDIT_START_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_START_DATE = dateFormat.format(new Date(parseInt(startDate)));
						}
						if (editPriceData[i].EDIT_END_DATE.split("(").length > 1) {
							var endDate = editPriceData[i].EDIT_END_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_END_DATE = dateFormat.format(new Date(parseInt(endDate)));
						}
						var data = {
							"Stylenumber": editPriceData[i].SELLING_STYLE_NUM__C,
							"Accountno": editPriceData[i].ACCOUNT__C,
							"Productuniquekey": editPriceData[i].PRODUCT_UNIQUE_KEY__C,
							"Whcode": this.selectedWH,
							"Cplpriceid": editPriceData[i].CPL_PRICE_ID__C,
							"Startdate": editPriceData[i].EDIT_START_DATE,
							"Enddate": editPriceData[i].EDIT_END_DATE,
							"Newstartdate": dpkStartdate,
							"Newenddate": dpkEnddate,
							"Cplrecordid": cplRecordId,
							"Approvalstatus": "1",
							"Justification": justification,
							"Promocode": txtPromocode.getSelectedKey(),
							"Modifiedby": that.loggedInUser,
							"Reqbillpricecarton": reqPriceCut[i],
							"Reqbillpricepallet": reqPriceRoll[i],
							"Reqnetpricecarton": reqPriceCut[i],
							"Reqnetpricepallet": reqPriceRoll[i]
						};
						payload.push(data);
					}
				} else if (this.selectedCat === "Resilient Tile") {
					updateUrl = "pricing/MultiInsertLimitedRT.xsjs";
					var payload = [];
					for (var i = 0; i < editPriceData.length; i++) {
						var cplRecordId = new Date().getTime().toString() + (Math.floor(Math.random() * (100000 - 9999)) + 9999);
						if (editPriceData[i].EDIT_START_DATE.split("(").length > 1) {
							var startDate = editPriceData[i].EDIT_START_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_START_DATE = dateFormat.format(new Date(parseInt(startDate)));
						}
						if (editPriceData[i].EDIT_END_DATE.split("(").length > 1) {
							var endDate = editPriceData[i].EDIT_END_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_END_DATE = dateFormat.format(new Date(parseInt(endDate)));
						}
						var data = {
							"Stylenumber": editPriceData[i].SELLING_STYLE_NUM__C,
							"Accountno": editPriceData[i].ACCOUNT__C,
							"Productuniquekey": editPriceData[i].PRODUCT_UNIQUE_KEY__C,
							"Whcode": this.selectedWH,
							"Cplpriceid": editPriceData[i].CPL_PRICE_ID__C,
							"Startdate": editPriceData[i].EDIT_START_DATE,
							"Enddate": editPriceData[i].EDIT_END_DATE,
							"Newstartdate": dpkStartdate,
							"Newenddate": dpkEnddate,
							"Cplrecordid": cplRecordId,
							"Approvalstatus": "1",
							"Justification": justification,
							"Promocode": txtPromocode.getSelectedKey(),
							"Modifiedby": that.loggedInUser,
							"Reqbillpricecarton": reqPriceCut[i],
							"Reqbillpricepallet": reqPriceRoll[i],
							"Reqnetpricecarton": reqPriceCut[i],
							"Reqnetpricepallet": reqPriceRoll[i]
						};
						payload.push(data);
					}
				}
				//Added by <JAYANT> for <2269>
				else if (this.selectedCat === "Cushion") {
					updateUrl = "pricing/MultiInsertLimitedCushion.xsjs";
					var payload = [];
					for (var i = 0; i < editPriceData.length; i++) {
						var cplRecordId = new Date().getTime().toString() + (Math.floor(Math.random() * (100000 - 9999)) + 9999);
						if (editPriceData[i].EDIT_START_DATE.split("(").length > 1) {
							var startDate = editPriceData[i].EDIT_START_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_START_DATE = dateFormat.format(new Date(parseInt(startDate)));
						}
						if (editPriceData[i].EDIT_END_DATE.split("(").length > 1) {
							var endDate = editPriceData[i].EDIT_END_DATE.split("(")[1].split(")")[0];
							editPriceData[i].EDIT_END_DATE = dateFormat.format(new Date(parseInt(endDate)));
						}
						var data = {
							"Stylenumber": editPriceData[i].SELLING_STYLE_NUM__C,
							"Accountno": editPriceData[i].ACCOUNT__C,
							"Productuniquekey": editPriceData[i].PRODUCT_UNIQUE_KEY__C,
							"Whcode": this.selectedWH,
							"Cplpriceid": editPriceData[i].CPL_PRICE_ID__C,
							"Startdate": editPriceData[i].EDIT_START_DATE,
							"Enddate": editPriceData[i].EDIT_END_DATE,
							"Newstartdate": dpkStartdate,
							"Newenddate": dpkEnddate,
							"Cplrecordid": cplRecordId,
							"Approvalstatus": "1",
							"Justification": justification,
							"Promocode": txtPromocode.getSelectedKey(),
							"Modifiedby": that.loggedInUser,
							"Reqbillprice": reqPriceSqYd[i],
							"Reqnetprice": reqPriceSqYd[i]
						};
						payload.push(data);
					}
				}
				//Added by <JAYANT> for <2269>
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
					var res = response;
					var g = that;
					if (g.multiEditType === "Create Limited Time Prices") { // Added by <JAYANT PRAKASH> for <4080> on <01.09.2021>
						$.ajax({
							url: "pricing/MultiUpdatecplcomment.xsjs",
							contentType: "application/json",
							method: "POST",
							async: false,
							data: JSON.stringify(cmtPayload),
							success: function (response) {
								console.log(response);
								g.OnCancelJustification();
								sap.ui.getCore().getModel("configModel").setProperty("/concatDataFlag", true);
								//g.getView().byId("meList").getModel("meViewModel").setData(undefined);
								sap.ui.getCore().busyIndicator.close();
								g.onOpenMessagebox(res);
								/*MessageBox.success(res.success[0], {
									actions: [MessageBox.Action.CLOSE],
									onClose: function (sAction) {
										g.onNavBack();
									}
								});*/
								// MessageBox.success("Success! Record Inserted Successfully");
								// g.fetchProducts();

							},
							error: function (error) {
								g.OnCancelJustification();
								// MessageBox.success(error.responseText);
								sap.ui.getCore().getModel("configModel").setProperty("/concatDataFlag", true);
								MessageBox.success(error.responseText, {
									actions: [MessageBox.Action.CLOSE],
									onClose: function (sAction) {
										g.onNavBack();
									}
								});
								console.log(error);
								sap.ui.getCore().busyIndicator.close();
							}
						});
						// Start of changes by <JAYANT PRAKASH> for <4080> on <01.09.2021>
					} else {
						var g = that;
						$.ajax({
							url: "pricing/MultiUpdatecplcomment.xsjs",
							contentType: "application/json",
							method: "POST",
							async: false,
							data: JSON.stringify(cmtPayload),
							success: function (response) {
								console.log(response);
								g.OnCancelJustification();
								// 								g.getView().byId("meList").getModel("meViewModel").setData(undefined);
								// g.fetchProducts();
								sap.ui.getCore().busyIndicator.close();
								g.onOpenMessagebox(res);
							},
							error: function (error) {
								MessageBox.success(error.error[0], {
									actions: [MessageBox.Action.CLOSE],
									onClose: function (sAction) {
										g.onNavBack();
									}
								});
								g.OnCancelJustification();
								// MessageBox.success(error.responseText);
								sap.ui.getCore().getModel("configModel").setProperty("/concatDataFlag", true);

								console.log(error);
								sap.ui.getCore().busyIndicator.close();
							}
						});
					} //End of changes by <JAYANT PRAKASH> for <4080> on <01.09.2021>

				},
				error: function (error) {
					var g = that;
					that.OnCancelJustification();
					sap.ui.getCore().getModel("configModel").setProperty("/concatDataFlag", true);
					MessageBox.success(error.responseText, {
						actions: [MessageBox.Action.CLOSE],
						onClose: function (sAction) {
							g.onNavBack();
						}
					});
					console.log(error);
					sap.ui.getCore().busyIndicator.close();
				}
			});
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

		onMESearch: function (oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				this.onMERefresh();
				return;
			}

			var header = sap.ui.getCore().getModel("configModel").getProperty("/mHeader");
			var width = this.getView()._oContextualSettings.contextualWidth;
			if (width > 700) {
				var f0 = header[0].field.includes("PRODUCT__R.") ? header[0].field.replace("PRODUCT__R.", "") : header[0].field;
				var f1 = header[1].field.includes("PRODUCT__R.") ? header[1].field.replace("PRODUCT__R.", "") : header[1].field;
				var f2 = header[2].field.includes("PRODUCT__R.") ? header[2].field.replace("PRODUCT__R.", "") : header[2].field;
				var f3 = header[3].field.includes("PRODUCT__R.") ? header[3].field.replace("PRODUCT__R.", "") : header[3].field;
				// var f4 = header[4].field.includes("PRODUCT__R.") ? header[4].field.replace("PRODUCT__R.", "") : header[4].field;
			}
			var aFilters = [];
			var sQuery = oEvent.getParameter("query");
			if (sQuery && sQuery.length > 0) {
				var filter1 = new Filter(f0, FilterOperator.Contains, sQuery);
				var filter2 = new Filter(f1, FilterOperator.Contains, sQuery);
				var filter3 = new Filter(f2, FilterOperator.Contains, sQuery);
				var filter4 = new Filter(f3, FilterOperator.Contains, sQuery);
				// var filter5 = new Filter(f4, FilterOperator.Contains, sQuery);
				aFilters.push(filter1, filter2, filter3, filter4);

				var oFilter = new Filter(aFilters);

				var oList = this.byId("meList");
				var oBinding = oList.getBinding("items");
				oBinding.filter(oFilter, "Application");
			} else {
				this.bindMERecords();
			}
		},

		onMERefresh: function () {
			this.byId("meList").getBinding("items").refresh();
			// this.setModel(this.oModel, "MasterModel");
			// this.getModel("MasterModel").refresh();
		},

		onOpenMessagebox: function (responsemsg) {

			if (!this._oDialogSuccessErrorMessage) {
				this._oDialogSuccessErrorMessage = sap.ui.xmlfragment("cf.cpl.fragments.SuccessErrorMessage", this);
				this.getView().addDependent(this._oDialogSuccessErrorMessage);
			}
			this._oDialogSuccessErrorMessage.open();

			var txtSuccess = sap.ui.getCore().byId("txtSuccess");
			txtSuccess.setText(responsemsg.success[0]);

			var messagelist = sap.ui.getCore().byId("messagelist");
			var msgJsonModel = new JSONModel();
			var values = msgJsonModel.getData();

			for (var i = 0; i < responsemsg.error.length; i++) {
				if (msgJsonModel.getData() !== null) {
					if (values.results === undefined) {
						values = {
							results: []
						};
					}

				} else {
					values = {
						results: []
					};
				}
				var item = {};
				item["Error"] = responsemsg.error[i];
				values.results.push(item);
				msgJsonModel.setData(values);
			}
			messagelist.setModel(msgJsonModel);
		},

		afterCloseMessage: function () {
			if (this._oDialogSuccessErrorMessage) {
				this._oDialogSuccessErrorMessage.destroy();
				this._oDialogSuccessErrorMessage = null;
			}

		},

		onbtnOK: function () {
			var that = this;
			this._oDialogSuccessErrorMessage.close();
			that.onNavBack();
		}

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf cf.cpl.view.MultiEdit
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf cf.cpl.view.MultiEdit
		 */
		//	onAfterRendering: function() {
		//
		//	},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf cf.cpl.view.MultiEdit
		 */
		//	onExit: function() {
		//
		//	}

	});

});