global class RemoveMandatoryProducts_BatchController implements Database.Batchable<SObject>, Database.Stateful {
    private String parentAccountId;
    private String parentAccountName;
    private String notifyOnCompleteEmail;
    private List<String> productIds;
    private List<String> mandatoryProductIds;
    private List<String> errors = new List<String>();

    public RemoveMandatoryProducts_BatchController(String paId, String paName, List<String> products, List<String> mpIds, String userName, String userEmail) {
        this.parentAccountId = paId;
        this.parentAccountName = paName;
        this.productIds = products;
        this.mandatoryProductIds = mpIds;
        this.notifyOnCompleteEmail = userEmail;
    }
    global Database.QueryLocator start(Database.BatchableContext BC) {
        List<String> mpIds = mandatoryProductIds;
        List<String> pIds = productIds;
        String paId = parentAccountId;
        String query = 'SELECT Id FROM Mandatory_Products__c WHERE Id =:mpIds OR (Account__r.ParentId =:paId AND Custom_Product__c =:pIds)';
        return Database.getQueryLocator(query);
    }

    global void execute(Database.BatchableContext BC, List<Mandatory_Products__c> mandatoryProducts) {
        try {
            if (mandatoryProducts.size() > 0) {
                delete mandatoryProducts;
            }
        } catch(Exception ex) {
            System.debug('exception: ' + ex.getMessage());
            errors.add(ex.getMessage());
        }
    }
    global void finish(Database.BatchableContext BC) {
        AsyncApexJob a = [SELECT Id, Status, NumberOfErrors, JobItemsProcessed, TotalJobItems, CreatedBy.Email FROM AsyncApexJob WHERE Id =:BC.getJobId()];
      
        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        mail.setToAddresses(new String[] {notifyOnCompleteEmail});
        mail.setSenderDisplayName('Salesforce Batch Process');
        mail.setSubject('Batch Mandatory Products');
        String msg = 'Batch job to remove mandatory products for ' + parentAccountName + ' and it\'s child accounts (if any)';
        if (a.NumberOfErrors > 0) {
            msg += ' has completed with ' + a.NumberOfErrors + ' errors.\n';
            msg += String.join(errors, '\n');
        } else {
            msg += ' has completed successfully';
        }
        mail.setPlainTextBody(msg);
        
        Messaging.sendEmail(new Messaging.SingleEmailMessage[] {mail});

    }

}