import * as UIActions from './ui_actions'
import * as Actions from '@vvvictorlee2020/core/store/constants'
import StorageService from '../services/utility/StorageService';
import WalletStorageService from '../services/wallets/StorageService';
import Scatter from "@vvvictorlee2020/core/models/Scatter";
import BackupService from "../services/utility/BackupService";
import SingletonService from "../services/utility/SingletonService";
import Keypair from '@vvvictorlee2020/core/models/Keypair';
import Account from '@vvvictorlee2020/core/models/Account';
import KeyPairService from '@vvvictorlee2020/core/services/secure/KeyPairService';
import PluginRepository from '@vvvictorlee2020/core/plugins/PluginRepository';
import {Blockchains} from "@vvvictorlee2020/core/models/Blockchains";
const migrations = require('../migrations/version');
import HistoricTransfer from '@vvvictorlee2020/core/models/histories/HistoricTransfer';
import HistoricExchange from '@vvvictorlee2020/core/models/histories/HistoricExchange';
import HistoricAction from '@vvvictorlee2020/core/models/histories/HistoricAction';
import {HISTORY_TYPES} from '@vvvictorlee2020/core/models/histories/History';
import SingularAccounts from "../services/utility/SingularAccounts";
import Friend from "../models/Friend";
import IdGenerator from '@vvvictorlee2020/core/util/IdGenerator';

const isPopOut = location.hash.replace("#/", '').split('?')[0] === 'popout' || !!window.PopOutWebView;
let migrationChecked = false;

const getStorageService = () => {
	return window.wallet ? WalletStorageService : StorageService;
}

export const actions = {
	setLoadingBalances:({commit}, x) => commit('setLoadingBalances', x),
    // UI
	[UIActions.SET_COLLAPSED_SIDEBAR]:({commit}, x) => {
		localStorage.setItem('collapsedSidebar', x);
		commit(UIActions.SET_COLLAPSED_SIDEBAR, x)
	},
	[UIActions.REMOVE_ACCOUNT_CACHE]:({commit}, x) => commit(UIActions.REMOVE_ACCOUNT_CACHE, x),
	[UIActions.SET_ACCOUNT_CACHE]:({commit}, x) => commit(UIActions.SET_ACCOUNT_CACHE, x),
	[UIActions.SET_PREMIUM]:({commit}, x) => commit(UIActions.SET_PREMIUM, x),
	[UIActions.SET_FEATURE_FLAGS]:({commit}, x) => commit(UIActions.SET_FEATURE_FLAGS, x),
	[UIActions.SET_EXCHANGEABLES]:({commit}, x) => commit(UIActions.SET_EXCHANGEABLES, x),
	[UIActions.SET_UNTOUCHABLES]:({commit}, x) => commit(UIActions.SET_UNTOUCHABLES, x),
	[UIActions.SET_CURRENCIES]:({commit}, x) => commit(UIActions.SET_CURRENCIES, x),
	[UIActions.SET_TOKEN_METAS]:({commit}, x) => commit(UIActions.SET_TOKEN_METAS, x),
	[UIActions.SET_RESTRICTED_APPS]:({commit}, x) => {
		window.localStorage.setItem('restrictedApps', x);
		commit(UIActions.SET_RESTRICTED_APPS, x);
	},
	[UIActions.SET_POPOUT]:({commit}, x) => commit(UIActions.SET_POPOUT, x),
	[UIActions.SET_PORTS]:({commit}, x) => commit(UIActions.SET_PORTS, x),
    [UIActions.SET_THEME]:({commit}, x) => {
        window.localStorage.setItem('theme', x);
	    commit(UIActions.SET_THEME, x);
    },
	[UIActions.SET_TOP_ACTIONS_COLOR]:({commit}, x) => commit(UIActions.SET_TOP_ACTIONS_COLOR, x),
	[UIActions.SET_IS_MOBILE]:({commit}, x) => commit(UIActions.SET_IS_MOBILE, x),
	[UIActions.SET_IS_MOBILE_DEVICE]:({commit}, x) => commit(UIActions.SET_IS_MOBILE_DEVICE, x),
	[UIActions.SET_SWIPED]:({commit}, x) => commit(UIActions.SET_SWIPED, x),
	[UIActions.SET_SCROLL]:({commit}, x) => commit(UIActions.SET_SCROLL, x),
	[UIActions.PUSH_POPUP]:({commit}, popup) => commit(UIActions.PUSH_POPUP, popup),
	[UIActions.RELEASE_POPUP]:({commit}, popup) => commit(UIActions.RELEASE_POPUP, popup),
	[UIActions.SET_FEATURED_APPS]:({commit}, x) => commit(UIActions.SET_FEATURED_APPS, x),
	[UIActions.SET_BOUGHT]:({commit}, x) => commit(UIActions.SET_BOUGHT, x),
	[UIActions.SET_KYC_REQUIRED]:({commit}, x) => commit(UIActions.SET_KYC_REQUIRED, x),
	[UIActions.SET_WORKING_SCREEN]:({commit}, x) => commit(UIActions.SET_WORKING_SCREEN, x),
	[UIActions.SET_WORKING_BAR]:({commit}, x) => commit(UIActions.SET_WORKING_BAR, x),

    // ScatterCore
    [Actions.SET_PRICE_DATA]:({commit}, x) => commit(Actions.SET_PRICE_DATA, x),
    [Actions.ADD_RESOURCES]:({commit}, x) => commit(Actions.ADD_RESOURCES, x),
    [Actions.SET_RESOURCES]:({commit}, x) => commit(Actions.SET_RESOURCES, x),
    [Actions.SET_DAPP_DATA]:({commit}, x) => commit(Actions.SET_DAPP_DATA, x),
    [Actions.SET_DAPP_LOGO]:({commit}, x) => commit(Actions.SET_DAPP_LOGO, x),
    [Actions.HOLD_SCATTER]:({commit}, scatter) => commit(Actions.SET_SCATTER, scatter),

	[UIActions.CREATE_SCATTER]:({state, commit, dispatch}, password) => {
		return new Promise(async (resolve, reject) => {
			const scatter = await Scatter.create();
			scatter.meta.acceptedTerms = true;

			await window.wallet.setSalt(IdGenerator.text(24));
			await window.wallet.unlock(password, true);
			dispatch(Actions.SET_SCATTER, scatter).then(async _scatter => {
				// TODO: Mobile unfriendly
				await BackupService.setDefaultBackupLocation();
				resolve(true);
			})
		})
	},

    [Actions.LOAD_SCATTER]:async ({commit, state, dispatch}) => {
	    let scatter = await getStorageService().getScatter();
	    if (!scatter) return null;

	    scatter = Scatter.fromJson(scatter);

	    if(!isPopOut && !migrationChecked){
		    migrationChecked = true;

	    	// Need to reset the version here
		    if(!scatter.simple){
			    scatter.simple = true;
			    scatter.meta.lastEmbedVersion = scatter.meta.version;
			    scatter.meta.version = '0.0.0';
			    scatter.meta.lastVersion = '0.0.0';
		    }

		    if(!scatter.friends) scatter.friends = [];
		    scatter.friends = scatter.friends.map(x => Friend.fromJson(x));

		    await require('@vvvictorlee2020/core/migrations/migrator').default(scatter, require('../migrations/version'));
		    scatter.meta.regenerateVersion();
	    }

	    // Always resetting these on load.
	    scatter.settings.blacklistAction('eos', 'eosio', 'updateauth');
	    scatter.settings.blacklistAction('eos', 'eosio', 'linkauth');
	    scatter.settings.blacklistAction('eos', 'eosio.msig', 'approve');

	    return commit(Actions.SET_SCATTER, scatter);
    },

    [Actions.SET_SCATTER]:async ({commit, state}, scatter) => {
        return new Promise(async resolve => {
            // await new Promise(r => setTimeout(() =>  r(getStorageService().setScatter(scatter)), 1))
            // commit(Actions.SET_SCATTER, scatter);
            commit(Actions.SET_SCATTER, Scatter.fromJson(await getStorageService().setScatter(scatter)));
            resolve(scatter);
        })
    },

    [Actions.SET_BALANCES]:({commit}, x) => commit(Actions.SET_BALANCES, x),
    [Actions.REMOVE_BALANCES]:({commit}, x) => commit(Actions.REMOVE_BALANCES, x),
    [Actions.SET_PRICES]:({commit}, prices) => commit(Actions.SET_PRICES, prices),
	[Actions.LOAD_HISTORY]:async ({commit}) => {
		let history = await getStorageService().getHistory();
		if(!history) return;
		history = history.filter(x => x.txid && x.txid.length)

		history = history.map(x => {
			if(x.type === HISTORY_TYPES.Transfer) return HistoricTransfer.fromJson(x);
			if(x.type === HISTORY_TYPES.Exchange) return HistoricExchange.fromJson(x);
			if(x.type === HISTORY_TYPES.Action) return HistoricAction.fromJson(x);
			return null;
		}).filter(x => x);

		commit(Actions.LOAD_HISTORY, history);
	},
    [Actions.UPDATE_HISTORY]:async ({dispatch}, x) => {
        await getStorageService().updateHistory(x);
	    dispatch(Actions.LOAD_HISTORY);
    },
    [Actions.DELTA_HISTORY]:async ({dispatch}, x) => {
        await getStorageService().deltaHistory(x);
	    dispatch(Actions.LOAD_HISTORY);
    },

};
