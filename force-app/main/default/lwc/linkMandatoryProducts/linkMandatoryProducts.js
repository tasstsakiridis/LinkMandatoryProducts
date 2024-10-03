import { LightningElement, api, wire } from 'lwc';
import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';

import getData from '@salesforce/apex/LinkMandatoryProducts_Controller.getData';
import linkProducts from '@salesforce/apex/LinkMandatoryProducts_Controller.linkProducts';
import unLinkProducts from '@salesforce/apex/LinkMandatoryProducts_Controller.unLinkProducts';

import OBJ_MANDATORY_PRODUCTS from '@salesforce/schema/Mandatory_Products__c';
import OBJ_PRODUCT from '@salesforce/schema/Product__c';

import FLD_PRODUCT_STATUS from '@salesforce/schema/Mandatory_Products__c.Product_Status__c';
import FLD_PRODUCT_USED_FOR from '@salesforce/schema/Product__c.Used_For__c';

import LABEL_ALL_PRODUCTS from '@salesforce/label/c.All_Products';
import LABEL_MANDATORY from '@salesforce/label/c.Mandatory';
import LABEL_PRODUCT from '@salesforce/label/c.Product';
import LABEL_SHOW from '@salesforce/label/c.Show';
import LABEL_STATUS from '@salesforce/label/c.Status';
import LABEL_USED_FOR from '@salesforce/label/c.Used_For';

const columns = [
    { label: LABEL_PRODUCT, fieldName: 'name' },
    { label: LABEL_STATUS, fieldName: 'status' }
];

export default class LinkMandatoryProducts extends LightningElement {
    labels = {
        allproducts: { label: LABEL_ALL_PRODUCTS },
        mandatory: { label: LABEL_MANDATORY },
        show: { label: LABEL_SHOW },
        status: { label: LABEL_STATUS },
        usedFor: { label: LABEL_USED_FOR }
    };

    @api
    recordId;

    isWorking;

    account;
    error;
    mandatoryProducts;
    allProducts;
    products;
    showingAllProducts = false;
    productStatus = 'Mandatory';
    productStatusOptions;
    usedFor;
    usedForOptions;

    data = [];
    selectedData = [];
    currentlySelectedData = [];
    columns = columns;

    get accountName() {
        return this.account == undefined ? '' : this.account.Name;
    }

    @wire(getObjectInfo, { objectApiName: OBJ_MANDATORY_PRODUCTS })
    mandatoryProductObjectInfo;
    
    //@wire(getObjectInfo, { objectApiName: OBJ_PRODUCT })
    //productObjectInfo;

    get mpRecordTypeId() {
        console.log('mpObjectInfo', this.mandatoryProductObjectInfo);
        // Returns a map of record type Ids 
        if (this.mandatoryProductObjectInfo && this.mandatoryProductObjectInfo.data) {
            const rtis = this.mandatoryProductObjectInfo.data.recordTypeInfos;
            return Object.keys(rtis).find(rti => rtis[rti].name === 'Master' || rtis[rti].master == true);    
        } else {
            return '';
        }
    }
    /*
    get productRecordTypeId() {
        console.log('productObjectInfo', this.productObjectInfo);
        // Returns a map of record type Ids 
        if (this.productObjectInfo && this.productObjectInfo.data) {
            const rtis = this.productObjectInfo.data.recordTypeInfos;
            return Object.keys(rtis).find(rti => rtis[rti].name === 'Wet Goods');    
        } else {
            return '';
        }
    }
    */
    @wire(getPicklistValues, { recordTypeId: '$mpRecordTypeId', fieldApiName: FLD_PRODUCT_STATUS })
    getWiredProductStatusValues({error, data}) {
        console.log('picklistvalues', data);
        if (data) {
            this.error = undefined;            
            this.productStatusOptions = data.values;            
        } else if (error) {
            this.productStatusOptions = undefined;
            this.error = error;
        }
    }
    /*
    @wire(getPicklistValues, { recordTypeId: '$productRecordType', fieldApiName: FLD_PRODUCT_USED_FOR })
    getWiredUsedForValues({error, data}) {
        console.log('product used for value', data);
        if (data) {
            this.error = undefined;
            this.usedForOptions = data.values;
        } else if (error) {
            this.usedForOptions = undefined;
            this.error = error;
        }
    }
    */
    wiredData;
    @wire(getData, { accountId: '$recordId' })
    getWiredData(value) {
        this.wiredData = value;
        this.isWorking = false;
        console.log('[getWiredData] recordId', this.recordId);
        console.log('[getWiredData] data', value.data);
        console.log('[getWiredData] error', value.error);
        if (value.data) {
            try {
                this.error = undefined;
                this.account = value.data.account;
                this.allProducts = value.data.products;
                this.mandatoryProducts = value.data.mandatoryProducts;
                console.log('account', this.account);
                console.log('allproducts', this.allProducts);
                console.log('mandatoryproducts', this.mandatoryProducts);

                this.showingAllProducts = false;
                let tableData = [];
                if (this.mandatoryProducts && this.mandatoryProducts.length > 0) {
                    tableData = this.mandatoryProducts.map(mp => {
                        return {
                            id: mp.Id,
                            name: mp.Product_Name__c,
                            productId: mp.Custom_Product__c,
                            status: mp.Product_Status__c
                        };
                    });                
                } else {
                    tableData = this.allProducts.map(p => {
                        return {
                            id: '',
                            name: p.Name,
                            productId: p.Id,
                            status: '',
                        };
                    });
                    this.showingAllProducts = true;
                }
                this.data = [...tableData];
                console.log('data', this.data);
            }catch(ex) {
                console.log('exception', ex);
            }finally{
                this.isWorking = false;
            }
        } else if (value.error) {
            this.error = value.error;
            this.account = undefined;
            this.allProducts = undefined;
            this.mandatoryProducts = undefined;
        }
    }

    connectedCallback() {
        this.isWorking = true;        
    }

    handleRowSelection(event) {
        try {
            console.log('[handleRowSelection] config', JSON.parse(JSON.stringify(event.detail)));
            switch (event.detail.config.action) {
                case 'selectAllRows':
                    for(let i = 0; i < event.detail.selectedRows.length; i++) {
                        this.selectedData.push(event.detail.selectedRows[i]);
                        this.currentlySelectedData.push(event.detail.selectedRows[i]);
                    }
                    break;

                case 'deselectAllRows':
                    this.selectedData = [];
                    this.currentlySelectedData = [];
                    break;

                case 'rowSelect':
                    this.currentlySelectedData = [...event.detail.selectedRows];
                    break;

                case 'rowDeselect':
                    const idx = this.currentlySelectedData.findIndex(r => r.productId == event.detail.config.value);
                    if (idx >= 0) {
                        this.currentlySelectedData.splice(idx, 1);
                    }
                    break;

                default:
                    break;
            }
        }catch(ex) {
            console.log('[handleRowSelection] ex', ex);
        }
    }

    handleProductStatusChange(ev) {
        this.productStatus = ev.detail.value;
        console.log('productStatus', this.productStatus);
    }
    hamdleUsedForChange(ev) {
        this.usedFor = ev.detail.value;
        const filteredProducts = this.allProducts.filter(p => p.Used_For__c == this.usedFor);
        this.products = [...filteredProducts];
    }
    handleBrandChange(ev) {
        this.selectedBrand = ev.detail.value;
        const filteredProducts = this.allProducts.filter(p => p.Brand__c == this.selectedBrand );
        this.products = [...filteredProducts];
    }

    toggleShownProducts(ev) {
        console.log('toggleShownProducts');
        this.isWorking = true;
        this.showingAllProducts = ev.detail.checked;
        if (this.showingAllProducts) {
            // Show all products
            let filteredProducts = this.allProducts;
            if (this.mandatoryProducts && this.mandatoryProducts.length > 0) {
                filteredProducts = this.allProducts.filter(p => !this.mandatoryProducts.find(mp => mp.Custom_Product__c == p.Id));                
            }
            console.log('filteredProducts', filteredProducts);            
            const d = filteredProducts.map(p => {
                return {
                    id: '',
                    name: p.Name,
                    productId: p.Id,
                    status: '',
                };
            });
            console.log('[showing all products] d', d);
            this.data = [...d];
        } else {
            // Show Mandatory products
            const d = this.mandatoryProducts.map(mp => {                
                return {
                    id: mp.Id,
                    name: mp.Product_Name__c,
                    productId: mp.Custom_Product__c,
                    status: mp.Product_Status__c
                };
            });    
            console.log('[showing mandatory products] d', d);
            this.data = [...d];            
        }

        this.isWorking = false;
    }
    
    save(event) {
        this.isWorking = true;
        //const selectedRows = this.template.querySelector('lightning-datatable').getSelectedRows();
        //console.log('selectedRows', selectedRows);
        const ids = this.currentlySelectedData.map(r => r.productId);        
        console.log('ids', ids);
        
        linkProducts({accountId: this.recordId, productStatus: this.productStatus, productIds: ids })
            .then(result => {
                this.isWorking = false;
                console.log('[linkProducts] result', result);
                if (result.status == 'OK') {
                    try {
                        this.showToast('success', 'Success', 'All products linked');
                        refreshApex(this.wiredData);
                    }catch(ex) {
                        console.log('[linkProducts] exception', ex);
                    }
                } else if (result.status == 'BULK') {
                    this.showToast('info', 'Warning', result.msg);
                } else {
                    this.showToast('error', 'Warning', result.msg);
                }
            })
            .catch(error => {
                this.isWorking = false;
                this.error = error;
                this.showToast('error', 'Warning', error.body.message);
            });
    }
    unlink() {
        this.isWorking = true;
        //const selectedRows = this.template.querySelector('lightning-datatable').getSelectedRows();
        console.log('selectedRows', this.currentlySelectedData);
        if (this.currentlySelectedData && this.currentlySelectedData.length > 0) {
            const ids = this.currentlySelectedData.map(r => r.id);
            const productIds = this.currentlySelectedData.map(r => r.productId);
            console.log('ids', ids);
            console.log('productIds', productIds);
            unLinkProducts({accountId: this.recordId, ids: ids, productIds: productIds })
                .then(result => {
                    this.isWorking = false;
                    if (result.status == 'OK') {
                        this.showToast('success', 'Success', 'Selected products removed');
                        refreshApex(this.wiredData);
                    } else if (result.status == 'BULK') {
                        this.showToast('info', 'Warning', result.msg);
                    } else {
                        this.showToast('error', 'Warning', result.msg);
                    }
                })
                .catch(error => {
                    this.isWorking = false;
                    this.error = error;
                    this.showToast('error', 'Warning', error.body.message);
                });
        }

    }

    showToast(type, title, msg) {
        console.log('[showToast] type', type, title, msg);
        try {
        var toastMessage = msg;
        if (Array.isArray(msg)) {
            toastMessage = '';
            msg.forEach(m => {
                toastMessage += m + '\n';
            });
        }
        const event = new ShowToastEvent({
            title: title,
            message: toastMessage,
            variant: type
        });

        this.dispatchEvent(event);
        }catch(ex) {
            console.log('[showToast] exception', ex);
        }   
    }

}