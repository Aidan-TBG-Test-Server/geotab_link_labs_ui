import axios from "axios";

interface GeotabSession {
    // https://developers.geotab.com/myGeotab/apiReference/objects/Credentials
        database: string;
        date: string;
        sessionId: string;
        userName: string;
}


/**
 * Interface representing the Geotab API.
 * Provides methods for interacting with the Geotab platform.
 * https://github.com/Geotab/sdk/blob/master/src/software/api/codebase/api.js
 */
interface GeotabAPI {
    /**
     * Makes a call to the Geotab API with the specified parameters.
     *
     * @param method - The name of the method to be called.
     * @param params - The parameters for the API call.
     * @param success - Callback function to handle successful response.
     * @param error - Callback function to handle errors.
     */
    call(method: string, params: any, success: (result: any) => void, error: (error: any) => void): void;

    /**
     *  Clears credentials and the credential store.
     *
     * @param {successCallback} callbackSuccess The function that is called if the retrieval of sessionId was successful
     */
    forget(success: (result: any) => void): void;

    /**
     * Retrieves the current bookmark state.
     *
     * @returns A Promise that resolves with the current bookmark state.
     */
    getBookmarkState(): Promise<any>;

    /**
     *  Retrieves a session. Useful for single sign-on or other cases where you require the credentials
     *  @param {successCallback} callbackSuccess The function that is called if the retrieval of sessionId was successful
     *  @param {Boolean} [newSession] If true, always retrieve a new session from the server. Otherwise, return the current session (if active) or
     *                              retrieve a new one from the server if there are no active sessions
     */
    getSession(callbackSuccess: (session: GeotabSession) => void, newSession: boolean): void;

    /**
     * Makes multiple API calls in a single request.
     *
     * @param methods - The array of method names to be called.
     * @param params - The array of parameters for each call.
     * @param callback - Callback function to handle the response.
     */
    multiCall(methods: string[], params: any[], callback: (results: any[]) => void): void;

    /**
     * Sets the bookmark state to the specified value.
     *
     * @param state - The new bookmark state to be set.
     */
    setBookmarkState(state: any): void;
}


interface PageState {
    /**
     * Creates a Google Analytics tag.
     * 
     * @param e - The event or data to be tracked.
     */
    createGtag(e: any): void;

    /**
     * Retrieves the advanced group filter.
     * 
     * @returns The advanced group filter.
     */
    getAdvancedGroupFilter(): any;

    /**
     * Retrieves the group filter.
     * 
     * @returns The group filter.
     */
    getGroupFilter(): any;

    /**
     * Retrieves the current state.
     * 
     * @returns The current state object.
     */
    getState(): any;

    /**
     * Navigates to a specified page.
     * 
     * @param t - The target page identifier.
     * @param i - Additional parameters for navigation.
     */
    gotoPage(t: string, i?: any): void;

    /**
     * Checks if the user has access to a specified page.
     * 
     * @param e - The page identifier.
     * @returns A boolean indicating access permission.
     */
    hasAccessToPage(e: string): boolean;

    /**
     * Sets the state to the specified value.
     * 
     * @param e - The new state to be set.
     */
    setState(e: any): void;

    /**
     * Translates a given key or phrase.
     * 
     * @param e - The key or phrase to be translated.
     * @returns The translated string.
     */
    translate(e: string): string;
}

type CallbackFunction = () => void;

const ACCESS_API_URL = import.meta.env.VITE_ACCESS_API_URL;

const access_api = axios.create({
    baseURL: ACCESS_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export async function geotab_sso({ userName, database, sessionId }: GeotabSession): Promise<boolean> {
    try {
        const response = await access_api.post('/access/geotab/sso', {
            username: userName,
            database: database,
            sessionId: sessionId
        });

        if (response.status === 200 && response.data.token) {
            const authHeader = `Bearer ${response.data.token}`;
            localStorage.setItem('authToken', authHeader);
            return true;
        }

        return false;
    } catch (error) {
        console.error('Login failed:', error);
        return false;
    }
}

interface GeotabLifecycleMethods {
    /**
     * Called only once when your custom page is first accessed.
     * Use this method to initialize variables required by your Add-In.
     * 
     * @param api - The Geotab API object.
     * @param state - The current page state.
     * @param callback - A function to call once initialization is complete.
     */
    initialize(api: GeotabAPI, state: PageState, callback: CallbackFunction): void;

    /**
     * This method is called after the user interface has loaded or the state of the organization filter is changed.
     * Use this method for initial interactions with the user or elements on the page.
     * 
     * @param api - The Geotab API object.
     * @param state - The current page state.
     */
    focus(api: GeotabAPI, state: PageState): void;

    /**
     * This method is called when the user is navigating away from your page.
     * Use this method to save any required state.
     * 
     * @param api - The Geotab API object.
     * @param state - The current page state.
     */
    blur(api: GeotabAPI, state: PageState): void;
}

export const GeotabLifecycle = (): GeotabLifecycleMethods => {
    // https://developers.geotab.com/myGeotab/addIns/developingAddIns#geotab-add-in-page-life-cycle

    return {
        async initialize(api, _state, callback) {
            console.log("Airfinder Add-In initialization...")
            // console.dir(api, { depth: null, colors: true });
            // console.dir(state, { depth: null, colors: true });

            api.getSession(
                async (session: GeotabSession) => {
                    console.log("session:")
                    console.dir(session, { depth: null, colors: true });

                    try {
                        const isAuthenticated = await geotab_sso(session);
                        if (isAuthenticated) {
                            console.log('Successfully authenticated with Geotab SSO.');
                            // Proceed with further initialization if needed
                        } else {
                            console.warn('Failed to authenticate with Geotab SSO.');
                            // Handle authentication failure, e.g., show login screen
                        }
                    } catch (error) {
                        console.error('Initialization failed:', error);
                    }
                },
                false
            );


            // NOTE: It's important to call the callback passed into initialize after all work is complete.
            // Keep in mind the asynchronous nature of JavaScript. The optional focus and blur methods will
            // be called due to the callback method being called in the initialize method.
            callback();
        },

        focus(_api, _state) {
            // console.log("start focus")
            // console.dir(api, { depth: null, colors: true });
            // console.dir(state, { depth: null, colors: true });
        },
        
        blur(_api, _state) {
            // console.log("start blur")
            // console.dir(api, { depth: null, colors: true });
            // console.dir(state, { depth: null, colors: true });
        }
    };
};
