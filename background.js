/* See license.txt for terms of usage */

// *************************************************************************************************

//var bookmarklet = "javascript:(typeof Firebug!='undefined')?Firebug.chrome.toggle():(function(F,i,r,e,b,u,g,L,I,T,E){if(F.getElementById(b))return;E=F[i+'NS']&&F.documentElement.namespaceURI;E=E?F[i+'NS'](E,'script'):F[i]('script');E[r]('id',b);E[r]('src',I+g+T);E[r](b,u);(F[e]('head')[0]||F[e]('body')[0]).appendChild(E);E=new%20Image;E[r]('src',I+L);})(document,'createElement','setAttribute','getElementsByTagName','FirebugLite','4','firebug-lite.js','releases/lite/latest/skin/xp/sprite.png','https://getfirebug.com/','#startOpened');";
var firebugVersion = "Firebug Lite 1.4.0";
var extensionURL = chrome.extension.getURL("");
var isActive = false;

// *************************************************************************************************

function handleIconClick(tab)
{
    if (tab.url.indexOf("https://chrome.google.com/webstore") == 0 ||
        tab.url.indexOf("https://chrome.google.com/extensions") == 0 ||
        tab.url.indexOf("chrome://") == 0)
    {
        alert("Sorry, for security reasons extensions cannot run scripts in this page, "+
                "which means Firebug Lite can't work here.   :(");
        
        return;
    }

    if (tab.url.indexOf("file:///") == 0)
    {
        // TODO: include message here about the problem, and chrome bug
        //chrome.tabs.update(tab.id, {url: bookmarklet});
        
        alert("So, you want to load Firebug Lite in a local file, huh?\n\n" +
        
            "Sorry to say but this is a complicated issue... there's a Chrome bug preventing us " +
            "to load Firebug Lite here, and there's a JavaScript security restriction " +
            "preventing us to do XHR calls.  :(\n\n" +
            
            "You can solve all these problems by using a local web server which is simple to " +
            "install and is safer for you.   :)\n\n" +

            "If you want to know more about this problem, and how to solve it, please read " +
            "our FAQ entry for this subject at:\n\n" +
            "http://getfirebug.com/wiki/index.php/Firebug_Lite_FAQ"
        );
        
        return;
    }
    
    var isContentScriptActive = false;

    
    var tryToActivateFirebug = function(){
        chrome.tabs.sendMessage( tab.id, {name: "FB_isActive"}, 
        
            function(response)
            {
                if(!!chrome.runtime.lastError && !!chrome.runtime.lastError.message) {
                    isContentScriptActive = false;
                    unsetActivationStorage(tab);
                }else{
                    isContentScriptActive = true;
                }
                
                // if (!!response && !!response.value && response.value == "true")
                // {
                //     chrome.tabs.executeScript(tab.id, {code: "Firebug.chrome.toggle()"});
                // }
                // else
                // {
                    if (!!response && !!response.value && response.value == "false") {
                        isContentScriptActive = false;
                        unsetActivationStorage(tab);
                    }else if(!!response && !!response.value && response.value == "csp") {
                        isContentScriptActive = false;
                        firebugShouldBeLoaded = false;
                        unsetActivationStorage(tab);
                    }else{
                        setActivationStorage(tab);
                        chrome.tabs.sendMessage(tab.id, {name: "FB_loadFirebug"});
                    }
                //}
            }
        );
    };

    var firebugShouldBeLoaded = tab.url.indexOf("https://") == 0 || tab.url.indexOf("http://") == 0;

    tryToActivateFirebug();
    
    setTimeout(function(){
    
        // the problem of this approach is that if the page does not allow content scripts, like
        // the Chrome Web Store, it will falsely warn users that reloading the page will complete
        // the activation process when in the reality it will not. But, the most common case is
        // when the user just installed Firebug Lite and have other tabs already opened, which
        // completely ruins the very first experience with using the Firebug Lite extension.
        if (!isContentScriptActive)
        {
            // try again
            tryToActivateFirebug();

            setTimeout(function(){
                if (!isContentScriptActive)
                {
                    //chrome.tabs.update(tab.id, {url: bookmarlet});
                    //enableBrowserActionIcon();
                    //setActivationStorage(tab);
                    
                    if (firebugShouldBeLoaded)
                    {
                        setActivationStorage(tab);
                        if (confirm("It seems that this page was opened before Firebug Lite was "+
                              "enabled. It will (hopefully) load after reloading this page.   :)"+
                              "\n\nPress ok to reload the page now, or cancel to reload it later."))
                        {
                            chrome.tabs.executeScript(tab.id, {code: "window.location.reload()"});
                        }
                    }
                    else
                    {
                        // TODO: add FAQ entry with the problem and point it here
                        alert("Sorry, Firebug Lite cannot be loaded in this page.   :(\n\nMost likely the security rules of the page prevent Firebug Lite from loading\n\nFor "+
                                "support, please visit:\nhttps://chrome.google.com/webstore/detail/firebug-lite-for-google-c/ehemiojjcpldeipjhjkepfdaohajpbdo?hl=en");
                    }
                }

            },500);

        }
        
    },500);
};

chrome.browserAction.onClicked.addListener(handleIconClick);

// *************************************************************************************************

function handleTabChange(tabId, selectInfo)
{
    var isUpdated = false;
    
    chrome.tabs.sendMessage(tabId, {name: "FB_isActive"}, 
    
        function(response)
        {
            isUpdated = true;
            
            if (!!response && !!response.value && response.value == "true")
            {
                enableBrowserActionIcon();
                isActive = true;
            }
            else
            {
                disableBrowserActionIcon();
                isActive = false;
            }
        }
    );
    
    setTimeout(function(){
    
        chrome.tabs.get(tabId, function(tab){
        
            var title = tab.title || "";
            if (!isUpdated && !title.indexOf("Firebug Lite") == 0)
            {
                disableBrowserActionIcon();
                isActive = false;
            }
            
        });
           
    },100);  
};

// *************************************************************************************************

chrome.tabs.onSelectionChanged.addListener(handleTabChange);

// *************************************************************************************************

function handleUpdateTab(tabId, updateInfo, tab)
{
    if (updateInfo.status == "complete") return;
    
    handleTabChange(tabId, updateInfo);
}

// memory leaking here
//chrome.tabs.onUpdated.addListener(handleUpdateTab);

// *************************************************************************************************

chrome.runtime.onMessage.addListener
(
    function(request, sender, sendResponse)
    {
        if (request.name == "FB_enableIcon")
            enableBrowserActionIcon();
        
        else if (request.name == "FB_disableIcon")
            disableBrowserActionIcon();
            
        else if (request.name == "FB_deactivate")
        {
            disableBrowserActionIcon();
            chrome.tabs.query({currentWindow: true}, function(tab){
                unsetActivationStorage(tab[0].id);
                
                chrome.tabs.sendMessage(tab[0].id, {name: "FB_deactivate"});
            });
        }

        sendResponse({}); // snub them.
    }
);

// *************************************************************************************************

chrome.contextMenus.create({
    title: "Inspect with Firebug Lite",
    "contexts": ["all"],
    onclick: function(info, tab) {
        //console.log(tab);
        if(!!tab && !!tab.id) {
            handleIconClick(tab);
            //chrome.tabs.sendMessage(tab.id, {name: "FB_contextMenuClick"});
        }else{
            chrome.tabs.query({currentWindow: true}, function(tabs) {
                //console.log(tabs);
                //console.log(tabs[0].id);
                //chrome.tabs.sendMessage(tabs[0].id, {name: "FB_contextMenuClick"});
                handleIconClick(tabs[0]);
            });
        }
    }
});

chrome.contextMenus.create({
    title: "Donate to keep Extensions Alive",
    "contexts": ["browser_action"],
    onclick: function(info, tab) {
        chrome.tabs.create({ url: 'https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=67TZLSEGYQFFW' });
    }
});

chrome.contextMenus.create({
    title: "Leave a review",
    "contexts": ["browser_action"],
    onclick: function(info, tab) {
        chrome.tabs.create({ url: 'https://chrome.google.com/webstore/detail/firebug-lite-for-google-c/ehemiojjcpldeipjhjkepfdaohajpbdo' });
    }
});

// *************************************************************************************************

function enableBrowserActionIcon()
{
    chrome.browserAction.setTitle({title: firebugVersion + " (On)"});
    chrome.browserAction.setIcon({path:"bug128.png"});
};

function disableBrowserActionIcon()
{
    chrome.browserAction.setTitle({title: firebugVersion + " (Off)"});
    chrome.browserAction.setIcon({path:"bug128off.png"});
};

// *************************************************************************************************

function setActivationStorage(tab)
{
    chrome.tabs.executeScript(tab.id, {code: "localStorage.setItem('Firebug','1,1,"+extensionURL+"')"});
    isActive = true;
};

function unsetActivationStorage(tab)
{
    chrome.tabs.executeScript(tab.id, {code: "localStorage.removeItem('Firebug')"});
    isActive = false;
};

// *************************************************************************************************