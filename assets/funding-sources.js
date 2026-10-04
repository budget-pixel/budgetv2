(function(root){
  'use strict';
  var buildingNote='The FY 2027 budget uses accumulated Building Fund reserves to reduce a balance above the statutory carryforward limit, rather than charging current permit applicants for this allocation. Section 553.80(7), Florida Statutes, generally limits carryforward to the average of the preceding four fiscal years of building-code enforcement operating budgets, excluding reserves. Restricted funds remain subject to statutory use requirements; this budgeted drawdown is not a certification of compliance.';
  function classify(row,key){
    var name=String(row.Revenue_Name||''),type=String(row.Revenue_Type||''),note=String(row.Note||'');
    var source=name,payer='Other funding sources',detail='Assigned revenue; not an equal charge to each household.';
    if(/balance brought forward/i.test(name)){source='Prior-year fund balance';payer='Accumulated fund resources';detail=key==='building department'?buildingNote:'Use of accumulated resources from prior years, not new revenue collected in FY 2027.';}
    else if(/interfund group transfer/i.test(name)){source='Interfund transfer';payer='Originating County fund';detail='Internal funding from another County fund; not a new charge to a department customer.';if(/small county surtax/i.test(note)||/public works|mossy head wastewater/.test(key)){source='Small County Surtax transfer';payer='Taxable purchasers';detail='Sales-tax-funded transfer from the originating fund; distinct from prior-year fund balance.';}if(/sheriff/.test(key)&&/property tax/i.test(note)){source='Property-tax transfer';payer='Property owners';detail='Assigned County property-tax support.';}else if(/sheriff/.test(key)&&/e911/i.test(note)){source='E911 transfer';payer='Phone-service customers';detail='Dedicated E911 funding, not property-tax support.';}}
    else if(/ad valorem/i.test(name)){source='Property taxes';payer='Property owners';detail='Assigned ad valorem property-tax revenue; individual bills depend on taxable value and exemptions.';if(key==='mosquito control'){payer='Property owners within the North Walton Mosquito Control District';detail='Funded by the separate district property-tax levy on properties within the district, not an allocation of the County operating levy. Individual bills depend on taxable value and exemptions.';}}
    else if(/tourist development|tdc public safety/i.test(name)){source='Tourist Development Tax'+(/reimburse/i.test(name)?' reimbursement':'');payer='Eligible short-term lodging customers';detail='Restricted tourism-tax funding; not a general household charge.';}
    else if(/fuel.*tax/i.test(name)){payer='Fuel purchasers';detail='Fuel-tax revenue from taxable fuel purchases by residents and non-residents.';}
    else if(/1\/2 cent sales tax|sales surtax|local option sales tax/i.test(name)){payer='Taxable purchasers';detail='Shared sales-tax revenue; not customer earnings or a separate property-tax allocation.';}
    else if(/telecommunication|local communication/i.test(name)){payer='Taxable communications-service customers';detail='Communications-tax revenue, not property taxes.';}
    else if(/indirect administrative/i.test(name)){source='Administrative cost allocation';payer='County funds receiving support';detail='Internal reimbursement for County administrative support, not a fee charged to an individual user.';}
    else if(/federal.*grant/i.test(name)){if(/housing/.test(key))source='Federal grant - Housing and Urban Development (HUD)';payer='Federal funding';detail='Federal program funding restricted to eligible uses.';}
    else if(/fees?|charges?|fine|rental|pro shop|food|beverage|non-taxable|entry/i.test(name)||/permits|charges for services|fines and forfeits/i.test(type)){payer=/fine/i.test(name)?'People or businesses assessed fines':/short-term rental certificate/i.test(name)?'Short-term rental owners':/permit/i.test(name)?'Permit applicants':/rental/i.test(name)?'Renters and lessees':'Service users and customers';detail='Paid when the related service, purchase, permit, rental, or assessed charge occurs.';}
    else if(/interest/i.test(name)){payer='Fund investment earnings';detail='Earnings on invested fund resources, not a new charge to residents.';}
    else if(/scrap|surplus.*sales/i.test(name)){payer='Purchasers of County surplus or scrap';detail='Proceeds from sales of County materials or property.';}
    else if(/intergovernmental/i.test(type)){payer='State or other government funding';detail='Assigned shared-government revenue or grant funding; not a department-specific household bill.';}
    return {source:source,payer:payer,detail:detail,amount:Number(row.FY2027_Proposed)||0};
  }
  function summarize(rows,key){
    var groups=[]; (rows||[]).forEach(function(row){var item=classify(row,key);if(!item.amount)return;var found=groups.find(function(g){return g.source===item.source&&g.payer===item.payer;});if(found)found.amount+=item.amount;else groups.push(item);});
    var total=(rows||[]).reduce(function(sum,row){return sum+(Number(row.FY2027_Proposed)||0);},0);
    if(Math.abs(groups.reduce(function(sum,g){return sum+g.amount;},0)-total)>.01)throw new Error('Funding sources do not reconcile');
    return {rows:groups.filter(function(g){return g.amount!==0;}),total:total};
  }
  root.WCFundingSources={summarize:summarize,buildingNote:buildingNote};
})(typeof globalThis!=='undefined'?globalThis:this);
