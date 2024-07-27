// ==UserScript==
// @name         MoegirlWiki Lyrics Extractor
// @name:zh-CN   萌娘百科歌词提取器
// @namespace    http://tampermonkey.net/
// @version      2024-07-24
// @description  将萌娘百科中通过 `LyricsKai` 模板引用的歌词整理成可以直接复制的文本，原文和译文分开。
// @author       Van Lee F. X. P.
// @match        https://*.moegirl.org.cn/*
// @icon         https://img.moegirl.org.cn/favicon.ico
// @grant        GM_addStyle
// @grant        GM_setClipboard
// ==/UserScript==

// General-Purpose Code ========================

// General-Purpose Variables and Functions ------------------------

const doc = document;

const $ele = ( name = "div", options = null ) => {
    const ele = doc.createElement ( name, options );
    if ( options != null ) {
        delete options.is;
        if ( options.hasOwnProperty ( "cls" ) ) {
            const cls = options.cls;
            if ( Array.isArray ( cls ) ) {
                // classes passed as array
                ele.classList.add ( ...cls );
            }
            else {
                // classes passed as string
                ele.classList.add ( ...cls.split ( /\s+/g ) );
            }
            delete options.cls;
        }
        if ( options.hasOwnProperty ( "data" ) ) {
            // data set
            Object.assign ( ele.dataset, options.data );
            delete options.data;
        }
        Object.assign ( ele, options );
    }
    return ele;
}

const $text = doc.createTextNode.bind ( doc );
const $frag = doc.createDocumentFragment.bind ( doc );

function debounce ( func, duration = 500 ) {
    let timerId;
    return function ( ...args ) {
        clearTimeout ( timerId );
        timerId = setTimeout ( 
            ( ) => { func.apply ( this, args ); }, 
            duration 
        );
    };
}

function throttle ( func, duration = 500 ) {
    let timerId = null;
    return function ( ...args ) {
        if ( timerId != null ) { return; }
        timerId = setTimeout ( 
            ( ) => { 
                func.apply ( this, args );
                timerId = null;
            }, 
            duration 
        );
    }
}

// General-Purpose Styles ------------------------

GM_addStyle (`
    body.prevent-scroll {
        position: fixed;
        background-attachment: fixed;
        top: var(--dy);
        left: var(--dx);
        background-position-x: var(--dx);
        background-position-y: var(--dy);
        width: var(--w);
        height: var(--h);
    }

    dialog.fxp-plugin {
        --shadow-color: rgb(0 0 0 / 25%);
        --fg-success: #00b42a;
        --bg-error: #e81123;

        inline-size: 50%;
        block-size: 75%;
        box-sizing: border-box;
        padding: 0;
        border-radius: 5px;
        border: none;
        resize: both;
        color: var(--text-100);
        background-color: var(--bg-100);
        filter: drop-shadow(0 0 30px var(--shadow-color));
        position: relative;
        /*overflow: visible;*/
    }

    dialog.fxp-plugin[data-color-mode="dark"] {
        --primary-100:#1F3A5F;
        --primary-200:#4d648d;
        --primary-300:#acc2ef;
        --accent-100:#3D5A80;
        --accent-200:#cee8ff;
        --text-100:#FFFFFF;
        --text-200:#e0e0e0;
        --bg-100:#0F1C2E;
        --bg-200:#1f2b3e;
        --bg-300:#374357;
    }

    dialog.fxp-plugin[data-color-mode="light"] {
        --primary-100:#d4eaf7;
        --primary-200:#b6ccd8;
        --primary-300:#3b3c3d;
        --accent-100:#71c4ef;
        --accent-200:#00668c;
        --text-100:#1d1c1c;
        --text-200:#313d44;
        --bg-100:#fffefb;
        --bg-200:#f5f4f1;
        --bg-300:#cccbc8;
    }

    dialog.fxp-plugin::backdrop {
        background-color: rgb(0 0 0 / 25%);
        backdrop-filter: blur(3px);
    }

    dialog.fxp-plugin .variant_success {
        color: var(--fg-success);
    }
    
    dialog.fxp-plugin > .popover {
        display: none;
        position: absolute;
        border-radius: 5px;
        padding: 20px;
        background-color: var(--bg-200);
        border: 1px solid var(--bg-300);
        bottom: 20px;
        right: 20px;
        filter: drop-shadow(0 0 10px var(--shadow-color));
    }

    dialog.fxp-plugin > .popover.showing {
        display: block;
    }

    dialog.fxp-plugin i[class^="ri-"] {
        font-size: 1.5em;
    }
    
    dialog.fxp-plugin > .dialog-window {
        display: grid;
        grid-template-rows: 
            [header] auto 
            [content] 1fr 
            [footer] auto;
        block-size: 100%;
    }

    dialog.fxp-plugin > .dialog-window > header {
        grid-row: header;
        border-radius: 5px 5px 0 0;
    }
    
    dialog.fxp-plugin > .dialog-window > .content {
        grid-row: content;
        overflow: hidden;
    }
    
    dialog.fxp-plugin > .dialog-window > .content > .content-internal {
        block-size: 100%;
    }

    dialog.fxp-plugin > .dialog-window > footer {
        grid-row: footer;
        border-radius: 0 0 5px 5px;
    }

    dialog.fxp-plugin > .dialog-window > :is(header, footer) {
        display: grid;
        grid-template-columns: 
            [content] 1fr 
            [buttons] auto;
        grid-auto-flow: column;
        background-color: var(--bg-300);
    }

    dialog.fxp-plugin > .dialog-window > :is(header, footer) > .content {
        grid-column: content;
        padding: 5px 15px;
    }

    dialog.fxp-plugin > .dialog-window > :is(header, footer) > .buttons {
        grid-column: buttons;
        display: grid;
        grid-auto-flow: column;
    }
    
    dialog.fxp-plugin > .dialog-window > :is(header, footer) > .buttons > 
    button {
        min-inline-size: 40px;
    }

    dialog.fxp-plugin button {
        border: none;
        background-color: transparent;
        font-family: inherit;
        font-size: inherit;
    }

    dialog.fxp-plugin .tabs {
        display: flex;
    }
    
    dialog.fxp-plugin .tabs > .tab {
        min-inline-size: 80px;
        padding: 10px 15px;
        text-align: start;
    }
    
    dialog.fxp-plugin > .dialog-window > :is(header, footer) > .buttons > 
    button:hover {
        background-color: var(--bg-200);
    }

    dialog.fxp-plugin > .dialog-window > header > .buttons > 
    button.close, 
    dialog.fxp-plugin textarea:focus {
        color: var(--text-100);
    }
    
    dialog.fxp-plugin > .dialog-window > header > .buttons > 
    button.close:hover {
        background-color: var(--bg-error);
    }

    dialog.fxp-plugin textarea {
        background-color: var(--bg-200);
    }

    dialog.fxp-plugin :is(button, textarea) {
        color: var(--text-200);
    }
    
    dialog.fxp-plugin :is(button, textarea):focus {
        outline: none;
    }
`);

( function ( ) {
    'use strict';

    // Auxiliary Functions ========================
    
    // Convert Lyrics to Pure Text ------------------------

    function findLyricsBlocks ( ) {
        return doc.querySelectorAll ( ".Lyrics" );
    }

    function extractLyrics ( lyrics_block ) {
        const output = [];
        lyrics_block.querySelectorAll ( ".Lyrics-line" ).forEach (
            lyrics_line => {
                let i = 0;
                Array.from ( lyrics_line.children ).forEach ( ( lyrics_text_block ) => {
                    if ( lyrics_text_block.matches ( ":not(.Lyrics-column-wrapped)" ) ) {
                        if ( output [ i ] == null ) { output.push ( "" ); }
                        output [ i ] += getPureLyricsText ( lyrics_text_block ) + "\n";
                        i++;
                    }
                } );
            }
        );
        return output;
    }

    function getPureLyricsText ( node ) {
        if ( node instanceof Text ) {
            return node.textContent;
        } else if ( node instanceof HTMLElement ) {
            if ( node.matches ( `:not(
                    style, rt,
                    span.template-ruby-hidden,
                    span.Utawari-lyric-tab,
                    sup.reference
            )` ) ) {
                let output = "";
                node.childNodes.forEach ( childNode => {
                    output += getPureLyricsText ( childNode );
                } );
                return output;
            }
        }
        return "";
    }

    function getPageLyrics ( ) {
        return Array.from ( findLyricsBlocks ( ) ).map ( ele => extractLyrics ( ele ) );
    }

    // Prevent and Recover Scroll ------------------------

    let dx = 0, dy = 0;

    const preventScrollOnResize = debounce ( ( ) => {
        doc.body.classList.remove ( "prevent-scroll" );
        doc.documentElement.scrollTo ( -dx, -dy );
        const rect = doc.body.getBoundingClientRect ( );
        Object.entries ( {
            "--w": `${rect.width}px`,
            "--h": `${rect.height}px`,
        } ).forEach ( ( [ k, v ] ) => { doc.body.style.setProperty ( k, v ) } );
        doc.body.classList.add ( "prevent-scroll" );
    }, 200 );

    function preventScroll ( ) {
        const rect = doc.body.getBoundingClientRect ( );
        [ dx, dy ] = [ rect.x, rect.y ];
        doc.body.classList.add ( "prevent-scroll" );
        Object.entries ( {
            "--dx": `${dx}px`,
            "--dy": `${dy}px`,
            "--w": `${rect.width}px`,
            "--h": `${rect.height}px`,
        } ).forEach ( ( [ k, v ] ) => { doc.body.style.setProperty ( k, v ) } );
        window.onresize = preventScrollOnResize;
    }

    function recoverScroll ( ) {
        window.onresize = null;
        doc.body.classList.remove ( "prevent-scroll" );
        doc.documentElement.scrollTo ( -dx, -dy );
    }

    // Main Program ========================

    // DOM Setup ------------------------

    // Add RemixIcon to HTML Head
    doc.head.append ( $ele ( "link", {
        href: "https://cdn.jsdelivr.net/npm/remixicon@4.3.0/fonts/remixicon.css",
        rel: "stylesheet",
    } ) );

    // Add entrance to the tool according to different skins
    if ( doc.body.classList.contains ( "skin-moeskin" ) ) {
        // MoeSkin
        const toolbar = doc.querySelector ( "#moe-global-toolbar.desktop-only" );
        toolbar.querySelector ( "#p-tb" ).innerHTML += `
            <li class="toolbar-link" data-v-f0c8232e>
                <a 
                    id="mg-lyrics_link" 
                    title="一键提取 LyricsKai 模板歌词" 
                    href="#" data-v-f0c8232e
                >
                    歌词提取助手
                </a>
            </li>
        `;
        toolbar.querySelector ( ".toolbar-inner-container" ).style.width = "auto";
    } else {
        // Vector
        doc.querySelector ( "#p-navigation" )
            .after ( doc.querySelector ( "#p-tb" ) ); // move the "Tools" section forward
        doc.querySelector ( "#p-tb > .body > ul" ).innerHTML += `
            <li>
                <a id="mg-lyrics_link" title="一键提取 LyricsKai 模板歌词" href="#">
                    歌词提取助手
                </a>
            </li>
        `;
    }

    // Build up dialog for the tool
    const dialog = $ele ( 
        "dialog", { 
        id: "mg-lyrics_dialog", 
        cls: "fxp-plugin",
        data: {
            colorMode: "dark",
        }
    } );
    dialog.innerHTML = `
    <div id="mg-lyrics_window" class="dialog-window">
        <header id="mg-lyrics_header">
            <div class="content">
                <strong>萌娘百科歌词提取助手</strong>
            </div>
            <div class="buttons">
                <button id="mg-lyrics_button-github" title="访问 GitHub 项目页">
                    <i class="ri-github-fill"></i>
                </button>
                <button id="mg-lyrics_button-close" class="close" title="关闭">
                    <i class="ri-close-line"></i>
                </button>
            </div>
        </header>
        <div id="mg-lyrics_main" class="content">
            <div class="content-internal">
                <div id="mg-lyrics_description">
                    轻松提取萌娘百科页面中使用 <code>LyricsKai</code> 模板书写的歌词，自动分离原文译文，可一键复制使用。
                </div>
                <div id="mg-lyrics_tabs" class="tabs"></div>
                <div id="mg-lyrics_preview"></div>
            </div>
        </div>
        <footer id="mg-lyrics_footer">
            <div id="mg-lyrics_msg" class="content">
                共发现 <data id="mg-lyrics_count"></data> 段歌词
            </div>
        </footer>
    </div>
    <div class="popover" id="mg-lyrics_popover-success">
        <i class="ri-checkbox-circle-fill variant_success"></i>
        复制成功
    </div>
    `;
    doc.body.append ( dialog );

    // Important Elements ------------------------

    const lyricsCount = dialog.querySelector ( "#mg-lyrics_count" );
    const tabsArea = dialog.querySelector ( "#mg-lyrics_tabs" );
    const previewArea = dialog.querySelector ( "#mg-lyrics_preview" );
    const popover = dialog.querySelector ( "#mg-lyrics_popover-success" );

    // Color Mode ------------------------

    const colorMediaQuery = matchMedia ( "(prefers-color-scheme: dark)" );
    const setColorMode = ( ) => {
        dialog.dataset.colorMode = colorMediaQuery.matches ? "dark" : "light";
    }; // Switch color mode according to system settings
    colorMediaQuery.addEventListener ( "change", setColorMode );
    setColorMode ( );

    // "Copied" Notification ------------------------

    let timerId;

    const closePopover = ( ) => {
        popover.classList.remove ( "showing" );
        timerId = null;
    };

    const showPopover = ( ) => {
        popover.classList.add ( "showing" );
        clearTimeout ( timerId );
        timerId = setTimeout ( closePopover, 1500 );
    };

    popover.onclick = closePopover;

    // Dialog Operations ------------------------

    let lyricsData = null;

    // Building up lyrics content
    const initDialog = ( ) => {
        lyricsData = getPageLyrics ( );
        lyricsCount.innerText = lyricsData.length.toString ( );
        lyricsData.forEach ( ( arr, i ) => {
            const lyrics_group = $ele ( "div", { cls: "lyrics-group" } );
            tabsArea.innerHTML += `<button class="tab">#${i + 1}</button>`;
            previewArea.append ( lyrics_group );
            arr.forEach ( ( lyrics_src, j ) => {
                const lyrics_box = $ele ( "div", { cls: "lyrics-box" } );
                lyrics_group.append ( lyrics_box );
                lyrics_box.innerHTML = `
                <header class="lyrics-header">
                    <div class="lyrics-header-text">
                        #${i + 1}
                        ${j == 0 ? "原文": "译文"}
                    </div>
                    <button class="lyrics-copy-button" title="复制">
                        <i class="ri-clipboard-line"></i>
                    </button>
                </header>
                <textarea readonly></textarea>
                `;
                const textarea = lyrics_box.querySelector ( "textarea" );
                textarea.append ( lyrics_src );
                lyrics_box.querySelector ( ".lyrics-copy-button" ).onclick = ( ) => {
                    GM_setClipboard ( textarea.textContent );
                    showPopover ( );
                };
            } );
        } );
    }

    // Entrance to the tool clicked
    doc.querySelector ( "#mg-lyrics_link" ).onclick = ( ) => {
        preventScroll ( );
        dialog.showModal ( );
        if ( lyricsData == null ) { initDialog ( ); }
    };

    // Close dialog
    dialog.querySelector ( "button.close" ).onclick = ( ) => { 
        dialog.close ( );
        recoverScroll ( );
    }

    // Link to GitHub repo
    dialog.querySelector ( "#mg-lyrics_button-github" ).onclick = ( ) => {
        window.open ( "https://github.com/van-lee-fxp/MoegirlWikiLyricsExtractor" );
    }

    // Additional Stylesheet ------------------------

    GM_addStyle (`
        dialog#mg-lyrics_dialog[data-color-mode="dark"] {
            --primary-100:#2E8B57;
            --primary-200:#61bc84;
            --primary-300:#c6ffe6;
            --accent-100:#8FBC8F;
            --accent-200:#345e37;
            --text-100:#FFFFFF;
            --text-200:#e0e0e0;
            --bg-100:#1E1E1E;
            --bg-200:#2d2d2d;
            --bg-300:#454545;
        }

        dialog#mg-lyrics_dialog[data-color-mode="light"] {
            --primary-100:#e5efc7;
            --primary-200:#d8dec2;
            --primary-300:#728927;
            --accent-100:#a4c639;
            --accent-200:#416700;
            --text-100:#1d1c1c;
            --text-200:#313d44;
            --bg-100:#fffefb;
            --bg-200:#f5f4f1;
            --bg-300:#cccbc8;
        }

        #mg-lyrics_main > .content-internal {
            display: grid;
            grid-template-rows: 
                [description] auto
                [tabs] auto 
                [preview] 1fr;
        }
        
        #mg-lyrics_description {
            grid-row: description;
            padding: 20px 15px;
            display: none;
        }

        #mg-lyrics_tabs {
            grid-row: tabs;
            display: none;
        }
        
        #mg-lyrics_preview {
            grid-row: preview;
            /*background-image: 
                url("https://www.transparenttextures.com/patterns/grunge-wall.png")
                url(https://www.toptal.com/designers/subtlepatterns/uploads/green_cup.png);*/
            padding: 0;
            scroll-snap-type: y mandatory;
            overflow: auto;
            scrollbar-gutter: stable;
            box-shadow: inset 0 0 15px var(--shadow-color);
        }

        #mg-lyrics_preview > .lyrics-group {
            display: grid;
            padding: 40px;
            grid-auto-flow: column;
            column-gap: 20px;
            block-size: 100%;
            box-sizing: border-box;
            scroll-snap-align: center;
            scroll-snap-stop: always;
            filter: drop-shadow(0 0 20px var(--shadow-color));
        }

        #mg-lyrics_preview > .lyrics-group > .lyrics-box {
            border-radius: 5px;
            overflow: hidden;
            display: grid;
            grid-template-rows: auto 1fr;
        }

        #mg-lyrics_preview > .lyrics-group > .lyrics-box > .lyrics-header {
            background-image: linear-gradient(
                to right, 
                var(--primary-100), 
                var(--primary-200)
            );
            min-block-size: 40px;
            color: var(--primary-300);
            display: grid;
            grid-auto-flow: column;
            grid-template-columns: 1fr auto;
        }

        #mg-lyrics_preview > .lyrics-group > .lyrics-box > .lyrics-header > 
        .lyrics-header-text {
            font-size: 1.5em;
            font-weight: 700;
            padding: 5px 15px;
        }

        #mg-lyrics_preview > .lyrics-group > .lyrics-box > .lyrics-header > 
        .lyrics-copy-button {
            inline-size: 40px;
            font-size: 1.25em;
            color: var(--primary-300);
            background-color: transparent;
            border: none;
        }
        
        #mg-lyrics_preview > .lyrics-group > .lyrics-box > .lyrics-header > 
        .lyrics-copy-button:hover {
            background-color: rgba(0 0 0 / 25%);
        }

        #mg-lyrics_preview > .lyrics-group > .lyrics-box > .lyrics-header > 
        .lyrics-copy-button:focus {
            outline: none;
        }

        #mg-lyrics_preview > .lyrics-group > .lyrics-box > textarea {
            resize: none;
            padding: 20px;
            border: none;
        }
    `);

} ) ( );