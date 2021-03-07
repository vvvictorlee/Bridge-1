import PopupService from "./PopupService";
import Popups from "../../util/Popups";
import PluginRepository from '@vvvictorlee2020/core/plugins/PluginRepository';
import {Blockchains} from '@vvvictorlee2020/core/models/Blockchains'
import SingularAccounts from "./SingularAccounts";
import HistoricAction from "@vvvictorlee2020/core/models/histories/HistoricAction";
import * as Actions from '@vvvictorlee2020/core/store/constants';
import {store} from "../../store/store";
import BalanceHelpers from "./BalanceHelpers";

export default class SavingsService {

	static canUseSavings(token){
		return BalanceHelpers.isSystemToken(token);
	}

	static async save(token){
		if(token.blockchain !== Blockchains.EOSIO) return PopupService.push(Popups.snackbar('Only EOSIO blockchains are supported for savings right now.'));

		const account = SingularAccounts.accounts([token.network()])[0];
		if(!account) return PopupService.push(Popups.snackbar('There was an error getting the account for this token.'));

		const cpu = parseFloat(parseFloat(token.amount) * 0.9).toFixed(token.decimals) + ' ' + token.symbol;
		const net = parseFloat(parseFloat(token.amount) * 0.1).toFixed(token.decimals) + ' ' + token.symbol;

		return this.eosSave(token, account, cpu, net, true);
	}

	static async unsave(token){
		if(token.blockchain !== Blockchains.EOSIO) return PopupService.push(Popups.snackbar('Only EOSIO blockchains are supported for savings right now.'));

		const account = SingularAccounts.accounts([token.network()])[0];
		if(!account) return PopupService.push(Popups.snackbar('There was an error getting the account for this token.'));

		// Grabbing the actual data from chain, so we aren't trying to unstake overages
		const accData = await PluginRepository.plugin('eos').accountData(account).catch(() => null);
		if(!accData || !accData.hasOwnProperty('self_delegated_bandwidth') || !accData.self_delegated_bandwidth) return null;
		const cpuAvailable = parseFloat(accData.self_delegated_bandwidth.cpu_weight.split(' ')[0]);
		const netAvailable = parseFloat(accData.self_delegated_bandwidth.net_weight.split(' ')[0]);

		let cpu = parseFloat(parseFloat(token.amount) * 0.9);
		if(cpu >= cpuAvailable) cpu = cpuAvailable;
		let net = parseFloat(parseFloat(token.amount) - parseFloat(cpu));
		if(net >= netAvailable) {
			cpu += net - netAvailable;
			net = netAvailable;
		}

		// Converting into compatible asset strings
		net = net.toFixed(token.decimals) + ' ' + token.symbol;
		cpu = cpu.toFixed(token.decimals) + ' ' + token.symbol;

		return this.eosSave(token, account, cpu, net, false);
	}

	static async eosSave(token, account, cpu, net, isStaking){

		// const stakeOrUnstake = () => new Promise(async (resolve, reject) => {
		// 	const eos = PluginRepository.plugin(Blockchains.EOSIO).getSignableEosjs(account, reject);
		//
		//
		// 	const name = isStaking ? 'delegatebw' : 'undelegatebw';
		// 	let data = isStaking ? {
		// 		from: account.name,
		// 		receiver: account.name,
		// 		stake_net_quantity:net,
		// 		stake_cpu_quantity:cpu,
		// 		transfer:false
		// 	} : {
		// 		from: account.name,
		// 		receiver: account.name,
		// 		unstake_net_quantity:net,
		// 		unstake_cpu_quantity:cpu,
		// 	};
		//
		// 	const actions = [{
		// 		account: 'eosio',
		// 		name,
		// 		authorization: [{
		// 			actor: account.name,
		// 			permission: account.authority,
		// 		}],
		// 		data,
		// 	}];
		//
		// 	const result = eos.transact({ actions }, { blocksBehind: 3, expireSeconds: 30, }).catch(err => {
		// 		console.error(err);
		// 		return null;
		// 	});
		// 	console.log('result', result);
		// 	resolve(result);
		// })
		//
		// return stakeOrUnstake().then(res => {
		// 	if(!res || !res.hasOwnProperty('transaction_id')) return false;
		//
		// 	PopupService.push(Popups.transactionSuccess(Blockchains.EOSIO, res.transaction_id));
		// 	const history = new HistoricAction(account, isStaking ? 'delegatebw' : 'undelegatebw', res.transaction_id);
		// 	store.dispatch(Actions.DELTA_HISTORY, history);
		// 	return true;
		// }).catch(err => {
		// 	PopupService.push(Popups.snackbar(err.hasOwnProperty('error') ? err.error : err));
		// 	return false;
		// })


		const result = await PluginRepository.plugin(Blockchains.EOSIO).stakeOrUnstake(account, cpu, net, isStaking).catch(x => x);
		if(result.hasOwnProperty('error')){
			PopupService.push(Popups.snackbar(result.error));
			return false;
		}

		PopupService.push(Popups.transactionSuccess(Blockchains.EOSIO, result.transaction_id));
		const history = new HistoricAction(account, isStaking ? 'delegatebw' : 'undelegatebw', result.transaction_id);
		store.dispatch(Actions.DELTA_HISTORY, history);
		return true;
	}

}
