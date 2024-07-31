// ==UserScript==
// @name         MoegirlWiki Lyrics Extractor
// @name:zh-CN   萌娘百科歌词提取助手
// @license      GPLv3
// @namespace    https://github.com/vanleefxp/
// @homepageURL  https://github.com/vanleefxp/MoegirlWikiLyricsExtractor
// @version      2024-07-31
// @description:zh-CN  将萌娘百科中通过 `LyricsKai` 模板引用的歌词整理成可以直接复制的文本，原文和译文分开。
// @author       Van Lee F. X. P.
// @match        https://zh.moegirl.org.cn/*
// @match        https://mzh.moegirl.org.cn/*
// @icon         https://img.moegirl.org.cn/favicon.ico
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @require      https://vanleefxp.github.io/utils/js/shortcuts.js
// @require      https://vanleefxp.github.io/utils/js/moegirlwiki.js
// ==/UserScript==

( function ( ) {
    'use strict';

    const GITHUB_REPO_URL = "https://github.com/vanleefxp/MoegirlWikiLyricsExtractor";

    addExternalCSS ( 
        // personal stylesheet
        "https://vanleefxp.github.io/utils/css/fxp-plugin/fxp-plugin.css",  
        // additional style for MoegirlWiki user scripts
        "https://vanleefxp.github.io/utils/css/fxp-plugin/moegirlwiki/moegirlwiki.css",  
        // RemixIcon
        "https://cdn.jsdelivr.net/npm/remixicon@4.3.0/fonts/remixicon.css",
    );

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

    // Main Program ========================

    console.log ( "Enabled: MoegirlWiki Lyrics Extractor" );

    // DOM Setup ------------------------

    // Build up dialog for the tool
    const dialog = $ele ( 
        "dialog", { 
        id: "mg-lyrics_dialog", 
        cls: "fxp-plugin",
        autofocus: true,
        data: {
            colorMode: "dark",
        }
    } );
    dialog.innerHTML = /* html */ `
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
            <div id="mg-lyrics_msg" class="content"></div>
        </footer>
    </div>
    <div class="popover" id="mg-lyrics_popover-success">
        <i class="ri-checkbox-circle-fill variant_success"></i>
        复制成功
    </div>
    `;
    doc.body.append ( dialog );

    // Important Elements ------------------------

    const footerContent = dialog.querySelector ( 
        "dialog > .dialog-window > footer > .content" 
    );
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
        const len = lyricsData.length;
        if ( len > 0 ) {
            footerContent.innerHTML = `共发现 <data>${len}</data> 段歌词`;

            // Build DOM to display lyrics
            lyricsData.forEach ( ( arr, i ) => {
                const lyrics_group = $ele ( "div", { cls: "lyrics-group" } );
                tabsArea.innerHTML += `<button class="tab">#${i + 1}</button>`;
                previewArea.append ( lyrics_group );
                arr.forEach ( ( lyrics_src, j ) => {
                    const lyrics_box = $ele ( "div", { cls: "lyrics-box" } );
                    lyrics_group.append ( lyrics_box );
                    lyrics_box.innerHTML = /* html */ `
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
        } else {
            const na_box = $ele ( "div", { cls: "full-page-prompt" } );
            na_box.innerHTML = `<div class="prompt-text">无可用歌词</div>`;
            previewArea.append ( na_box );
            footerContent.innerHTML = "当前页面未发现可用歌词";
        }
    }

    // Entrance to the tool clicked
    MoegirlWiki.addTool ( 
        "t-lyrics-extractor", 
        "歌词提取助手", 
        "一键提取 LyricsKai 模板歌词" 
    ).addEventListener ( "click", ( ) => {
        doc.body.classList.add ( "prevent-scroll" );
        dialog.showModal ( );
        if ( lyricsData == null ) { initDialog ( ); }
    } );

    // Close dialog
    dialog.querySelector ( "button.close" )
        .addEventListener ( "click", ( ) => { dialog.close ( ); } );
    dialog.addEventListener ( "close", ( ) => {
        doc.body.classList.remove ( "prevent-scroll" ); 
    } );

    // Link to GitHub repo
    dialog.querySelector ( "#mg-lyrics_button-github" )
        .addEventListener ( "click", ( ) => { window.open ( GITHUB_REPO_URL ); } );

    // Additional Stylesheet ------------------------

    GM_addStyle (/* css */`
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