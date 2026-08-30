import type { AdapterRunResult } from '../../domain/types';
import { providerError } from '../live';
export function unavailableNative(adapterId:string,sourceId:string,at:string,reason:string):AdapterRunResult{return providerError(adapterId,sourceId,at,'rpc',reason,false)}
