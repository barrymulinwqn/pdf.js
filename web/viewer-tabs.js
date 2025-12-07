/* Copyright 2024
 * Tab management for PDF.js viewer
 */

class PDFTabManager {
  constructor() {
    this.currentTab = 1;
    this.tabs = {
      1: {
        button: null,
        frame: null,
        loaded: false
      },
      2: {
        button: null,
        frame: null,
        loaded: false
      }
    };
  }

  init() {
    // 检查是否在 iframe 中，如果在 iframe 中，不显示 tab 模式
    const isInIframe = window.self !== window.top;
    const tabModeContainer = document.getElementById('tabModeContainer');
    const outerContainer = document.getElementById('outerContainer');

    if (isInIframe) {
      // 在 iframe 中，显示正常的 viewer，隐藏 tab 模式
      if (tabModeContainer) {
        tabModeContainer.style.display = 'none';
      }
      if (outerContainer) {
        outerContainer.style.display = 'block';
      }
      return; // 不初始化 tab 功能
    }

    // 不在 iframe 中，显示 tab 模式，隐藏正常 viewer
    if (tabModeContainer) {
      tabModeContainer.style.display = 'block';
    }
    if (outerContainer) {
      outerContainer.style.display = 'none';
    }

    // 获取 tab 按钮和 iframe
    this.tabs[1].button = document.getElementById('tab1');
    this.tabs[2].button = document.getElementById('tab2');
    this.tabs[1].frame = document.getElementById('viewerFrame1');
    this.tabs[2].frame = document.getElementById('viewerFrame2');

    // 检查元素是否存在
    if (!this.tabs[1].button || !this.tabs[2].button || 
        !this.tabs[1].frame || !this.tabs[2].frame) {
      console.error('PDF Tab Manager: Required elements not found');
      return;
    }

    // 绑定事件
    this.tabs[1].button.addEventListener('click', () => this.switchToTab(1));
    this.tabs[2].button.addEventListener('click', () => this.switchToTab(2));

    // 从 URL 参数获取 PDF 文件路径，如果没有参数则从 HTML 中的 src 提取
    const params = new URLSearchParams(window.location.search);
    
    // 获取 PDF1：优先使用 URL 参数，否则从 iframe 的 src 中提取
    let pdf1 = params.get('pdf1');
    if (!pdf1 && this.tabs[1].frame && this.tabs[1].frame.src) {
      const urlParams = new URLSearchParams(this.tabs[1].frame.src.split('?')[1] || '');
      pdf1 = urlParams.get('file') || 'compressed.tracemonkey-pldi-09.pdf';
    } else if (!pdf1) {
      pdf1 = 'compressed.tracemonkey-pldi-09.pdf';
    }
    
    // 获取 PDF2：优先使用 URL 参数，否则从 iframe 的 src 中提取
    let pdf2 = params.get('pdf2');
    if (!pdf2 && this.tabs[2].frame && this.tabs[2].frame.src) {
      const urlParams = new URLSearchParams(this.tabs[2].frame.src.split('?')[1] || '');
      pdf2 = urlParams.get('file') || 'compressed.tracemonkey-pldi-09.pdf';
    } else if (!pdf2) {
      pdf2 = 'compressed.tracemonkey-pldi-09.pdf';
    }

    // 设置 iframe 的 src（只有在 URL 参数指定时才覆盖）
    // 添加 disableAutoFetch=true 参数，实现按需加载（只加载可见页面）
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
    
    // 确保所有 iframe 都添加 disableAutoFetch 参数
    const ensureDisableAutoFetch = (frame, pdfFile) => {
      if (!frame) return;
      
      if (frame.src) {
        // 如果已有 src，确保添加 disableAutoFetch 参数
        try {
          const url = new URL(frame.src, window.location.href);
          if (!url.searchParams.has('disableAutoFetch')) {
            url.searchParams.set('disableAutoFetch', 'true');
            frame.src = url.toString();
            console.log(`Tab Manager: Added disableAutoFetch to iframe, URL: ${frame.src}`);
          }
        } catch (e) {
          // 如果 URL 解析失败，使用字符串拼接
          const separator = frame.src.includes('?') ? '&' : '?';
          frame.src = `${frame.src}${separator}disableAutoFetch=true`;
          console.log(`Tab Manager: Added disableAutoFetch to iframe (fallback), URL: ${frame.src}`);
        }
      } else {
        // 如果没有 src，设置完整的 URL
        frame.src = `${baseUrl}viewer.html?file=${encodeURIComponent(pdfFile)}&disableAutoFetch=true`;
        console.log(`Tab Manager: Set iframe src with disableAutoFetch, URL: ${frame.src}`);
      }
    };
    
    if (params.get('pdf1') && this.tabs[1].frame) {
      this.tabs[1].frame.src = `${baseUrl}viewer.html?file=${encodeURIComponent(pdf1)}&disableAutoFetch=true`;
      console.log(`Tab Manager: PDF1 iframe src set: ${this.tabs[1].frame.src}`);
    } else {
      ensureDisableAutoFetch(this.tabs[1].frame, pdf1);
    }
    
    if (params.get('pdf2') && this.tabs[2].frame) {
      this.tabs[2].frame.src = `${baseUrl}viewer.html?file=${encodeURIComponent(pdf2)}&disableAutoFetch=true`;
      console.log(`Tab Manager: PDF2 iframe src set: ${this.tabs[2].frame.src}`);
    } else {
      ensureDisableAutoFetch(this.tabs[2].frame, pdf2);
    }

    // 默认显示第一个 tab
    this.switchToTab(1);
  }

  switchToTab(tabNumber) {
    if (this.currentTab === tabNumber) {
      return; // 已经是当前 tab
    }

    // 隐藏当前 tab 的 iframe
    if (this.tabs[this.currentTab].frame) {
      this.tabs[this.currentTab].frame.style.display = 'none';
    }

    // 显示新 tab 的 iframe
    if (this.tabs[tabNumber].frame) {
      this.tabs[tabNumber].frame.style.display = 'block';
    }

    // 更新按钮样式
    if (this.tabs[this.currentTab].button) {
      this.tabs[this.currentTab].button.classList.remove('active');
      this.tabs[this.currentTab].button.style.opacity = '0.7';
      this.tabs[this.currentTab].button.style.borderBottom = '2px solid transparent';
      this.tabs[this.currentTab].button.style.fontWeight = 'normal';
    }

    if (this.tabs[tabNumber].button) {
      this.tabs[tabNumber].button.classList.add('active');
      this.tabs[tabNumber].button.style.opacity = '1';
      this.tabs[tabNumber].button.style.borderBottom = '2px solid var(--progressBar-color, #0a84ff)';
      this.tabs[tabNumber].button.style.fontWeight = '500';
    }

    this.currentTab = tabNumber;
    this.tabs[tabNumber].loaded = true;
  }
}

// 初始化 Tab Manager
let tabManager;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    tabManager = new PDFTabManager();
    tabManager.init();
  });
} else {
  tabManager = new PDFTabManager();
  tabManager.init();
}

export { tabManager };

