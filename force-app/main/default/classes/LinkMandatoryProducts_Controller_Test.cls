@isTest(SeeAllData=true)
public class LinkMandatoryProducts_Controller_Test {
    static testMethod void unitTest1() {
        Map<String, RecordTypeInfo> aRecordTypes = Schema.SObjectType.Account.getRecordTypeInfosByName();
        Map<String, RecordTypeInfo> pRecordTypes = Schema.SObjectType.Product__c.getRecordTypeInfosByName();
        String rtAccount = aRecordTypes.get('AUD - Outlet').getRecordTypeId();
        String rtParent = aRecordTypes.get('Parent').getRecordTypeId();
        String rtWetGoods = pRecordTypes.get('Wet Goods').getRecordTypeId();

        INFW_TestHelper helper = new INFW_TestHelper();

        Market__c mAU = new Market__c();
        mAU.Name = 'TestAustralia';
        mAU.Vistex_Clearing_Account__c = '0123456789';
        mAU.Country_ISO_Code_2__c = 'AU';
        mAU.Country_ISO_Code_3__c = 'AUS';
        insert mAU;
        
        Brand__c brand = new Brand__c();
        brand.Name = 'Brand';
        brand.eClips_Relevent__c = true;
        brand.Is_Active__c = true;
        insert brand;

        Account a2 = new Account();
        a2.Name = 'Test Parent Account';
        a2.Market__c = mAU.Id;
        a2.RecordTypeId = rtParent;
        a2.Channel__c = 'On';
        insert a2;

        Account a = new Account();
        a.Name = 'Test Account';
        a.Market__c = mAU.Id;
        a.RecordTypeId = rtAccount;
        a.Channel__c = 'On';
        a.Actionable_Segment__c = 'Casual Dining';
        a.ParentId = a2.Id;
        insert a;

        List<Product__c> products = helper.createProducts(10, 'Wet Goods', mAU.Id, brand.Id, false);
        insert products;

        List<String> mandatoryProductIds = new List<String>();
        List<String> productIds = new List<String>();
        for(Product__c p : products) {
            productIds.add(p.Id);
        }

        Map<String, Object> data = LinkMandatoryProducts_Controller.getData(a2.Id);
        data = LinkMandatoryProducts_Controller.linkProducts(a2.Id, 'Mandatory', productIds);
        data = LinkMandatoryProducts_Controller.unLinkProducts(a2.Id, mandatoryProductIds, productIds);

    }
}
