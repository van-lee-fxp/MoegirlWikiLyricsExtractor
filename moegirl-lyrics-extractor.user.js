// ==UserScript==
// @name         MoegirlWiki Lyrics Extractor
// @name:zh-CN   萌娘百科歌词提取助手
// @license      GPLv3
// @namespace    https://github.com/vanleefxp/
// @homepageURL  https://github.com/vanleefxp/MoegirlWikiLyricsExtractor
// @version      2024-07-31
// @description:zh-CN  将萌娘百科中通过 `LyricsKai` 模板引用的歌词整理成原文和译文分开的纯文本格式，支持一键复制。
// @author       Van Lee F. X. P.
// @match        https://zh.moegirl.org.cn/*
// @match        https://mzh.moegirl.org.cn/*
// @icon         https://img.moegirl.org.cn/favicon.ico
// @require      https://vanleefxp.github.io/code/js/userscript-helper/add-resource.js
// ==/UserScript==

( function ( ) {
    'use strict';

    AddResource.CSS ( 
        // personal stylesheet
        "https://vanleefxp.github.io/code/css/fxp-plugin/fxp-plugin.css",  
        // additional style for MoegirlWiki user scripts
        "https://vanleefxp.github.io/code/css/fxp-plugin/userscript/moegirlwiki/moegirlwiki.css",
        "https://vanleefxp.github.io/code/css/fxp-plugin/userscript/moegirlwiki/moegirlwiki-lyrics-extractor/moegirlwiki-lyrics-extractor.css",
        // RemixIcon
        "https://cdn.jsdelivr.net/npm/remixicon@4.3.0/fonts/remixicon.css",
    )
    .JS ( 
        // jQuery
        "https://code.jquery.com/jquery-3.7.1.js",
        // Vue
        "https://cdn.jsdelivr.net/npm/vue",
    )
    .JS.toBody.asModule (
        "https://vanleefxp.github.io/code/js/module/vue/userscript/moegirlwiki/moegirlwiki-lyrics-extractor/index.js",
    );

} ) ( );