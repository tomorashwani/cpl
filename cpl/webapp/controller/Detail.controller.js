sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/m/library"
], function (BaseController, JSONModel, formatter, mobileLibrary) {
	"use strict";

	// shortcut for sap.m.URLHelper
	var URLHelper = mobileLibrary.URLHelper;

	return BaseController.extend("cf.cpl.controller.Detail", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function () {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				busy: false,
				delay: 0,
				lineItemListTitle: this.getResourceBundle().getText("detailLineItemTableHeading")
			});

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

			this.setModel(oViewModel, "detailView");

			// this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));

			//var pViewData = sap.ui.getCore().getModel("pViewModel").getData();

		},
		onAfterRendering: function (oEvent) {
			// this.selectedCat = document.getElementById('container-cpl---App--prodCat-labelText').innerHTML;
			//var selectedItem=document.getElementsByClassName('sapMLIBSelected').item(0).innerText.split('\n')[1];
			//var detailModel = new JSONModel();
			//this.getView().setModel(detailModel, "listModel");
		},
		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler when the share by E-Mail button has been clicked
		 * @public
		 */
		onSendEmailPress: function () {
			var oViewModel = this.getModel("detailView");

			URLHelper.triggerEmail(
				null,
				oViewModel.getProperty("/shareSendEmailSubject"),
				oViewModel.getProperty("/shareSendEmailMessage")
			);
		},

		/**
		 * Updates the item count within the line item table's header
		 * @param {object} oEvent an event containing the total number of items in the list
		 * @private
		 */
		onListUpdateFinished: function (oEvent) {
			var sTitle,
				iTotalItems = oEvent.getParameter("total"),
				oViewModel = this.getModel("detailView");

			// only update the counter if the length is final
			if (this.byId("lineItemsList").getBinding("items").isLengthFinal()) {
				if (iTotalItems) {
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeadingCount", [iTotalItems]);
				} else {
					//Display 'Line Items' instead of 'Line items (0)'
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeading");
				}
				oViewModel.setProperty("/lineItemListTitle", sTitle);
			}
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function (oEvent) {
			// var sObjectId = oEvent.getParameter("arguments").objectId;
			// var path = oEvent.getParameter("arguments").path;
			// var title = oEvent.getParameter("arguments").title;
			// var num = oEvent.getParameter("arguments").num;
			// var numUnit = oEvent.getParameter("arguments").numUnit;
			var pDetailModel = sap.ui.getCore().getModel("pViewModel");
			var priceData = pDetailModel.getData();
			var oModel = new JSONModel();
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");

			/*var selectedData = priceData.filter(function (a) {
				return a.INVENTORY_STYLE_NUM__C === sObjectId;
			});
			if (selectedData.length === 0) {
				selectedData = priceData[path];
			}*/

			this.userRole = sap.ui.getCore().getModel("configModel").getProperty("/userRole");
			var selectedData = sap.ui.getCore().getModel("configModel").getProperty("/selectedItem");
			oModel.setData(selectedData);
			this.getView().setModel(oModel, "detModel");
			this.bindData(selectedData);
		},

		bindData: function (selectedData) {
			var configData = sap.ui.getCore().getModel("configModel").getProperty("/mHeader");
			var t0 = configData[0].field.includes("PRODUCT__R.") ? configData[0].field.replace("PRODUCT__R.", "") : configData[0].field;
			var iObjIde = new sap.m.ObjectIdentifier({
				title: configData[0].header,
				text: selectedData[t0],
				titleActive: false
			}).addStyleClass("dHeaderObjAtr");
			var t1 = configData[1].field.includes("PRODUCT__R.") ? configData[1].field.replace("PRODUCT__R.", "") : configData[1].field;
			var sObjIde = new sap.m.ObjectIdentifier({
				title: configData[1].header,
				text: selectedData[t1],
				titleActive: false
			}).addStyleClass("dHeaderObjAtrSec");

			var tlVBox = this.getView().byId("tlVB");
			tlVBox.removeAllItems();
			tlVBox.insertItem(iObjIde, 0);
			tlVBox.insertItem(sObjIde, 1);
			var t2 = configData[2].field.includes("PRODUCT__R.") ? configData[2].field.replace("PRODUCT__R.", "") : configData[2].field;
			var t3 = configData[3].field.includes("PRODUCT__R.") ? configData[3].field.replace("PRODUCT__R.", "") : configData[3].field;
			var iiObjIde = new sap.m.ObjectIdentifier({
				title: configData[2].header,
				text: selectedData[t2],
				titleActive: false
			}).addStyleClass("dHeaderObjAtr");
			var ssObjIde = new sap.m.ObjectIdentifier({
				title: configData[3].header,
				text: selectedData[t3],
				titleActive: false
			}).addStyleClass("dHeaderObjAtrSec");

			var tcVBox = this.getView().byId("tcVB");
			tcVBox.removeAllItems();
			tcVBox.insertItem(iiObjIde, 0);
			tcVBox.insertItem(ssObjIde, 1);

			var t4 = configData[4].field.includes("PRODUCT__R.") ? configData[4].field.replace("PRODUCT__R.", "") : configData[4].field;
			var t5 = configData[5].field.includes("PRODUCT__R.") ? configData[5].field.replace("PRODUCT__R.", "") : configData[5].field;

			var iiiObjIde = new sap.m.ObjectIdentifier({
				title: configData[4].header,
				text: selectedData[t4],
				titleActive: false
			}).addStyleClass("dHeaderObjAtr");
			var sssObjIde = new sap.m.ObjectIdentifier({
				title: configData[5].header,
				text: selectedData[t5],
				titleActive: false
			}).addStyleClass("dHeaderObjAtrSec");

			var trVBox = this.getView().byId("trVB");
			trVBox.removeAllItems();
			trVBox.insertItem(iiiObjIde, 0);
			trVBox.insertItem(sssObjIde, 1);

			var allData = sap.ui.getCore().getModel("configModel").getData();
			var selectedCat = sap.ui.getCore().getModel("configModel").getProperty("/selectedCat");
			var primary = allData.filter(function (a) {
				return a['PRODUCT_CATEGORY__C'] === selectedCat && a['MODAL_SECTION__C'] === "Primary Information";
			});

			var secondary = allData.filter(function (a) {
				return a['PRODUCT_CATEGORY__C'] === selectedCat && a['MODAL_SECTION__C'] === "Secondary Information";
			});

			var that = this;
			var pricing = allData.filter(function (a) {
				if (that.userRole === "TM") {
					return a['PRODUCT_CATEGORY__C'] === selectedCat && a['MODAL_SECTION__C'] === "Pricing Information" && a['ACCESS_LEVEL__C'] ===
						"TM";
				} else if (that.userRole === "DM") {
					return a['PRODUCT_CATEGORY__C'] === selectedCat && a['MODAL_SECTION__C'] === "Pricing Information" && (a['ACCESS_LEVEL__C'] ===
						"TM" || a['ACCESS_LEVEL__C'] === "DM");
				} else if (that.userRole === "RVP") {
					return a['PRODUCT_CATEGORY__C'] === selectedCat && a['MODAL_SECTION__C'] === "Pricing Information" && (a['ACCESS_LEVEL__C'] ===
						"TM" || a['ACCESS_LEVEL__C'] === "DM" || a['ACCESS_LEVEL__C'] === "RVP");
				} else {
					return a['PRODUCT_CATEGORY__C'] === selectedCat && a['MODAL_SECTION__C'] === "Pricing Information";
				}
			});

			var pricing = allData.filter(function (a) {
				return a['PRODUCT_CATEGORY__C'] === selectedCat && a['MODAL_SECTION__C'] === "Pricing Information";
			});
			
			selectedData.TM1_ROLL_PRICE__C = selectedData.TM1_ROLL_PRICE__C !== null ? selectedData.TM1_ROLL_PRICE__C : "0";
			selectedData.TM2_ROLL_PRICE__C = selectedData.TM2_ROLL_PRICE__C !== null ? selectedData.TM2_ROLL_PRICE__C : "0";
			selectedData.TM3_ROLL_PRICE__C = selectedData.TM3_ROLL_PRICE__C !== null ? selectedData.TM3_ROLL_PRICE__C : "0";
			selectedData.DM_ROLL_PRICE__C = selectedData.DM_ROLL_PRICE__C !== null ? selectedData.DM_ROLL_PRICE__C : "0";
			selectedData.RVP_ROLL_PRICE__C = selectedData.RVP_ROLL_PRICE__C !== null ? selectedData.RVP_ROLL_PRICE__C : "0";

			selectedData.TM1_CUT_PRICE__C = selectedData.TM1_CUT_PRICE__C !== null ? selectedData.TM1_CUT_PRICE__C : "0";
			selectedData.TM2_CUT_PRICE__C = selectedData.TM2_CUT_PRICE__C !== null ? selectedData.TM2_CUT_PRICE__C : "0";
			selectedData.TM3_CUT_PRICE__C = selectedData.TM3_CUT_PRICE__C !== null ? selectedData.TM3_CUT_PRICE__C : "0";
			selectedData.DM_CUT_PRICE__C = selectedData.DM_CUT_PRICE__C !== null ? selectedData.DM_CUT_PRICE__C : "0";
			selectedData.RVP_CUT_PRICE__C = selectedData.RVP_CUT_PRICE__C !== null ? selectedData.RVP_CUT_PRICE__C : "0";

			selectedData.TM1_PRICE_CONCAT__C = "$" + (parseFloat(selectedData.TM1_ROLL_PRICE__C)).toFixed(2) + " / $" + (parseFloat(
				selectedData.TM1_CUT_PRICE__C)).toFixed(
				2);
			selectedData.TM_2_PRICE_CONCAT__C = "$" + (parseFloat(selectedData.TM2_ROLL_PRICE__C)).toFixed(2) + " / $" + (parseFloat(
				selectedData.TM2_CUT_PRICE__C)).toFixed(
				2);
			selectedData.TM3_PRICE_CONCAT__C = "$" + (parseFloat(selectedData.TM3_ROLL_PRICE__C)).toFixed(2) + " / $" + (parseFloat(
				selectedData.TM3_CUT_PRICE__C)).toFixed(
				2);
			selectedData.DM_PRICE_CONCAT__C = "$" + (parseFloat(selectedData.DM_ROLL_PRICE__C)).toFixed(2) + " / $" + (parseFloat(selectedData.DM_CUT_PRICE__C))
				.toFixed(2);
			selectedData.RVP_PRICE_CONCAT__C = "$" + (parseFloat(selectedData.RVP_ROLL_PRICE__C)).toFixed(2) + " / $" + (parseFloat(
				selectedData.RVP_CUT_PRICE__C)).toFixed(2);

			/*selectedData.TM1_ROLL_PRICE__C !== null && selectedData.TM1_CUT_PRICE__C !== null ? selectedData.TM1_PRICE_CONCAT__C = "$" + (
					selectedData.TM1_ROLL_PRICE__C).toFixed(2) + " / $" + (selectedData.TM1_CUT_PRICE__C).toFixed(2) : selectedData.TM1_PRICE_CONCAT__C =
				selectedData.TM1_ROLL_PRICE__C + " / " + selectedData.TM1_CUT_PRICE__C;
			selectedData.TM2_ROLL_PRICE__C !== null && selectedData.TM2_CUT_PRICE__C !== null ? selectedData.TM_2_PRICE_CONCAT__C = "$" + (
					selectedData.TM2_ROLL_PRICE__C).toFixed(2) + " / $" + (selectedData.TM2_CUT_PRICE__C).toFixed(2) : selectedData.TM_2_PRICE_CONCAT__C =
				selectedData.TM2_ROLL_PRICE__C + " / " + selectedData.TM2_CUT_PRICE__C;
			selectedData.TM3_ROLL_PRICE__C !== null && selectedData.TM3_CUT_PRICE__C !== null ? selectedData.TM3_PRICE_CONCAT__C = "$" + (
					selectedData.TM3_ROLL_PRICE__C).toFixed(2) + " / $" + (selectedData.TM3_CUT_PRICE__C).toFixed(2) : selectedData.TM3_PRICE_CONCAT__C =
				selectedData.TM3_ROLL_PRICE__C + " / " + selectedData.TM3_CUT_PRICE__C;
			selectedData.DM_ROLL_PRICE__C !== null && selectedData.DM_CUT_PRICE__C !== null ? selectedData.DM_PRICE_CONCAT__C = "$" + (
					parseFloat(selectedData.DM_ROLL_PRICE__C)).toFixed(2) + " / $" + (parseFloat(selectedData.DM_CUT_PRICE__C)).toFixed(2) :
				selectedData.DM_PRICE_CONCAT__C = selectedData.DM_ROLL_PRICE__C + " / " + selectedData.DM_CUT_PRICE__C;
			selectedData.RVP_ROLL_PRICE__C !== null && selectedData.RVP_CUT_PRICE__C !== null ? selectedData.RVP_PRICE_CONCAT__C = "$" + (
					parseFloat(selectedData.RVP_ROLL_PRICE__C)).toFixed(2) + " / $" + (parseFloat(selectedData.RVP_CUT_PRICE__C)).toFixed(2) :
				selectedData.RVP_PRICE_CONCAT__C = selectedData.RVP_ROLL_PRICE__C + " / " + selectedData.RVP_CUT_PRICE__C;*/


			var pGrid = this.getView().byId("primaryGrid");
			pGrid.removeAllContent();
			for (var p = 0; p < primary.length; p++) {
				var field = primary[p]['FIELD_API_NAME__C'].toUpperCase();
				field = field.includes("PRODUCT__R.") ? field.replace("PRODUCT__R.", "") : field;
				// field = field.includes("_CONCAT_") ? field.replace("_CONCAT_", "_NUM_") : field;
				var p1ObjAttr = new sap.m.ObjectAttribute({
					title: primary[p]['SHORT_LABEL__C'],
					text: selectedData[field] //pViewData[0].BRAND_DESCRIPTION__C
				});
				pGrid.insertContent(p1ObjAttr);
			}

			var sGrid = this.getView().byId("secondaryGrid");
			sGrid.removeAllContent();
			for (var p = 0; p < secondary.length; p++) {
				var field = secondary[p]['FIELD_API_NAME__C'].toUpperCase();
				field = field.includes("PRODUCT__R.") ? field.replace("PRODUCT__R.", "") : field;
				var sObjAttr = new sap.m.ObjectAttribute({
					title: secondary[p]['SHORT_LABEL__C'],
					text: selectedData[field] //pViewData[0].BRAND_DESCRIPTION__C
				});
				sGrid.insertContent(sObjAttr);
			}

			var tGrid = this.getView().byId("pricingGrid");
			tGrid.removeAllContent();
			for (var p = 0; p < pricing.length; p++) {
				var field = pricing[p]['FIELD_API_NAME__C'].toUpperCase();
				field = field.includes("PRODUCT__R.") ? field.replace("PRODUCT__R.", "") : field;
				var tObjAttr = new sap.m.ObjectAttribute({
					title: pricing[p]['SHORT_LABEL__C'],
					text: selectedData[field]
				});
				tGrid.insertContent(tObjAttr);
			}

		},

		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		_bindView: function (sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);

			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function () {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function () {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		_onBindingChange: function () {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("detailObjectNotFound");
				// if object could not be found, the selection in the master list
				// does not make sense anymore.
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				return;
			}

			var sPath = oElementBinding.getPath(),
				oResourceBundle = this.getResourceBundle(),
				oObject = oView.getModel().getObject(sPath),
				sObjectId = oObject.CategoryID,
				sObjectName = oObject.CategoryName,
				oViewModel = this.getModel("detailView");

			this.getOwnerComponent().oListSelector.selectAListItem(sPath);

			oViewModel.setProperty("/shareSendEmailSubject",
				oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
			oViewModel.setProperty("/shareSendEmailMessage",
				oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
		},

		_onMetadataLoaded: function () {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("detailView"),
				oLineItemTable = this.byId("lineItemsList"),
				iOriginalLineItemTableBusyDelay = oLineItemTable.getBusyIndicatorDelay();

			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);
			oViewModel.setProperty("/lineItemTableDelay", 0);

			oLineItemTable.attachEventOnce("updateFinished", function () {
				// Restore original busy indicator delay for line item table
				oViewModel.setProperty("/lineItemTableDelay", iOriginalLineItemTableBusyDelay);
			});

			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		},

		/**
		 * Set the full screen mode to false and navigate to master page
		 */
		onCloseDetailPress: function () {
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
			// No item should be selected on master after detail page is closed
			this.getOwnerComponent().oListSelector.clearMasterListSelection();
			this.getRouter().navTo("master");
		},

		/**
		 * Toggle between full and non full screen mode.
		 */
		toggleFullScreen: function () {
			var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
			if (!bFullScreen) {
				// store current layout and go full screen
				this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
				this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
			} else {
				// reset to previous layout
				this.getModel("appView").setProperty("/layout", this.getModel("appView").getProperty("/previousLayout"));
			}
		}
	});

});