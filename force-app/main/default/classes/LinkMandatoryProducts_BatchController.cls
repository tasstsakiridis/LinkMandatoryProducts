global class LinkMandatoryProducts_BatchController implements Database.Batchable<SObject>, Database.Stateful {
    private String parentAccountId;
    private String parentAccountName;
    private String productStatus = 'Mandatory';
    private String action = 'link';    // link or remove
    private String notifyOnCompleteEmail;
    private List<String> productIds;
    private List<String> errors = new List<String>();

    public LinkMandatoryProducts_BatchController(String paId, String paName, String pStatus, List<String> products, String userName, String userEmail) {
        this.parentAccountId = paId;
        this.parentAccountName = paName;
        this.productStatus = pStatus;
        this.productIds = products;
        this.notifyOnCompleteEmail = userEmail;
    }

    global Database.QueryLocator start(Database.BatchableContext BC) {
        String paId = parentAccountId;
        String query = 'SELECT Id, Name FROM Account WHERE Id =:paId OR ParentId =:paId';
        return Database.getQueryLocator(query);
    }
    global void execute(Database.BatchableContext BC, List<Account> accounts) {
        try {
            Boolean found = false;
            List<String> accountIds = new List<String>();                
            for(Account a : accounts) {
                accountIds.add(a.Id);
            }

            List<Mandatory_Products__c> mpToCreate = new List<Mandatory_Products__c>();
            List<Mandatory_Products__c> existingMP = [SELECT Id, Account__c, Custom_Product__c, Product_Status__c
                                                        FROM Mandatory_Products__c
                                                        WHERE Account__c=:parentAccountId
                                                            OR Account__c=:accountIds];

            for(Account a : accounts) {

                for(String productId : productIds) {
                    found = false;
                    for(Mandatory_Products__c mp : existingMP) {
                        if (mp.Account__c == a.Id && mp.Custom_Product__c == productId) {
                            if (mp.Product_Status__c != productStatus) {
                                mp.Product_Status__c = productStatus;
                                mpToCreate.add(mp);
                            }
                            found = true; break;
                        }
                    }
                    if (!found) {
                        Mandatory_Products__c mp = new Mandatory_Products__c();
                        mp.Account__c = a.Id;
                        mp.Custom_Product__c = productId;
                        mp.Product_Status__c = productStatus;
        
                        mpToCreate.add(mp);    
                    }
                }
            }
            if (mpToCreate.size() > 0) {
                upsert mpToCreate;
            }
        }catch(Exception ex) {
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
        String msg = 'Batch job to add mandatory products for ' + parentAccountName + ' and it\'s child accounts (if any)';
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
