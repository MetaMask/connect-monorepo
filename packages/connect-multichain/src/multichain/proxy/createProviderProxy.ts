import { MultichainSDK } from "..";

export const createProviderProxy = (multichainSDK: MultichainSDK) => new Proxy<any>(multichainSDK, {
  get: function(target, prop, _receiver) {
    return function(...args: any[]) {
      console.log('proxy get', prop, args);
      if(!target.transport) {
        console.log('transport not initialized, connecting from proxy');
        // Problem is that this will make a method that wasn't previously async become async
        return target.connect().then(() => {
          return target.__provider[prop](...args);
        });
      } else {
        return target.__provider[prop](...args);
      }
    };
  }
});
