import StoreService from "@vvvictorlee2020/core/services/utility/StoreService";
import * as UIActions from "../store/ui_actions";

export default class Loader {

	static set(bool){
		return StoreService.get().dispatch(UIActions.SET_WORKING_SCREEN, bool);
	}

	static setWorkingBar(nullOrPercentage){
		return StoreService.get().dispatch(UIActions.SET_WORKING_BAR, nullOrPercentage);
	}

}