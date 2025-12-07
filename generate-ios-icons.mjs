#!/usr/bin/env node
/**
 * iOS App Icon Generator
 * 从源图片生成完整的iOS应用图标集，保证不失真
 */

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join, basename, extname } from 'path';
import { mkdir, access } from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// iOS应用图标所需的所有尺寸（像素）
const iOSIconSizes = [
  // App Icon - iPhone
  { name: 'Icon-App-20x20@2x.png', size: 40 },      // iPhone Notification
  { name: 'Icon-App-20x20@3x.png', size: 60 },      // iPhone Notification
  { name: 'Icon-App-29x29@2x.png', size: 58 },      // iPhone Settings
  { name: 'Icon-App-29x29@3x.png', size: 87 },      // iPhone Settings
  { name: 'Icon-App-40x40@2x.png', size: 80 },      // iPhone Spotlight
  { name: 'Icon-App-40x40@3x.png', size: 120 },     // iPhone Spotlight
  { name: 'Icon-App-60x60@2x.png', size: 120 },     // iPhone App
  { name: 'Icon-App-60x60@3x.png', size: 180 },     // iPhone App
  
  // App Icon - iPad
  { name: 'Icon-App-20x20@1x.png', size: 20 },      // iPad Notification
  { name: 'Icon-App-20x20@2x.png', size: 40 },      // iPad Notification
  { name: 'Icon-App-29x29@1x.png', size: 29 },      // iPad Settings
  { name: 'Icon-App-29x29@2x.png', size: 58 },      // iPad Settings
  { name: 'Icon-App-40x40@1x.png', size: 40 },      // iPad Spotlight
  { name: 'Icon-App-40x40@2x.png', size: 80 },      // iPad Spotlight
  { name: 'Icon-App-76x76@1x.png', size: 76 },      // iPad App
  { name: 'Icon-App-76x76@2x.png', size: 152 },     // iPad App
  { name: 'Icon-App-83.5x83.5@2x.png', size: 167 }, // iPad Pro App
  
  // App Store
  { name: 'Icon-App-1024x1024@1x.png', size: 1024 }, // App Store
];

/**
 * 生成单个图标
 * 保持原图不变，使用最高质量缩放算法
 */
async function generateIcon(inputPath, outputPath, size, sourceMetadata) {
  try {
    const input = sharp(inputPath);
    
    // 如果原图正好是这个尺寸，直接复制（不进行任何处理）
    if (sourceMetadata.width === size && sourceMetadata.height === size) {
      const fs = await import('fs/promises');
      const sourceBuffer = await fs.readFile(inputPath);
      await fs.writeFile(outputPath, sourceBuffer);
      console.log(`✓ 复制原图: ${outputPath} (${size}x${size} - 未处理)`);
      return;
    }
    
    // 使用最高质量的缩放算法（lanczos3）保证不失真
    await input
      .resize(size, size, {
        fit: 'contain', // 保持原图宽高比，不裁剪
        background: { r: 0, g: 0, b: 0, alpha: 0 }, // 透明背景
        kernel: sharp.kernel.lanczos3, // 使用lanczos3算法，最高质量
        withoutEnlargement: false // 允许放大和缩小
      })
      .png({
        quality: 100, // 最高质量
        compressionLevel: 6, // 平衡压缩（0-9，6是质量和文件大小的平衡点）
        palette: false, // 不使用调色板，保持真彩色
        force: true
      })
      .toFile(outputPath);
    
    console.log(`✓ 生成: ${outputPath} (${size}x${size})`);
  } catch (error) {
    console.error(`✗ 生成失败 ${outputPath}:`, error.message);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('使用方法: node generate-ios-icons.mjs <源图片路径> [输出目录]');
    console.log('');
    console.log('示例:');
    console.log('  node generate-ios-icons.mjs logo.png');
    console.log('  node generate-ios-icons.mjs logo.png ./ios-icons');
    console.log('');
    console.log('支持的格式: PNG, JPG, JPEG, SVG, WebP');
    process.exit(1);
  }

  const inputPath = args[0];
  const outputDir = args[1] || join(__dirname, 'ios-icons');

  // 检查源文件是否存在
  if (!existsSync(inputPath)) {
    console.error(`错误: 源图片文件不存在: ${inputPath}`);
    process.exit(1);
  }

  // 创建输出目录
  try {
    await mkdir(outputDir, { recursive: true });
    console.log(`输出目录: ${outputDir}\n`);
  } catch (error) {
    console.error(`错误: 无法创建输出目录: ${error.message}`);
    process.exit(1);
  }

  // 验证源图片并获取元数据
  let sourceMetadata;
  try {
    sourceMetadata = await sharp(inputPath).metadata();
    console.log(`源图片信息:`);
    console.log(`  路径: ${inputPath}`);
    console.log(`  尺寸: ${sourceMetadata.width}x${sourceMetadata.height}`);
    console.log(`  格式: ${sourceMetadata.format}`);
    console.log(`  颜色空间: ${sourceMetadata.space || '未知'}`);
    console.log(`  通道数: ${sourceMetadata.channels || '未知'}\n`);
    
    // 检查源图片尺寸建议
    if (sourceMetadata.width < 1024 || sourceMetadata.height < 1024) {
      console.log(`⚠️  警告: 源图片尺寸小于1024x1024，可能影响大尺寸图标的质量`);
      console.log(`   建议使用至少1024x1024的源图片以获得最佳效果\n`);
    }
  } catch (error) {
    console.error(`错误: 无法读取源图片: ${error.message}`);
    console.error('请确保文件是有效的图片格式 (PNG, JPG, SVG, WebP)');
    process.exit(1);
  }

  // 生成所有尺寸的图标
  console.log('开始生成iOS图标（保持原图不变，使用最高质量缩放）...\n');
  
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;
  let copiedCount = 0;

  for (const icon of iOSIconSizes) {
    try {
      const outputPath = join(outputDir, icon.name);
      const wasCopied = sourceMetadata.width === icon.size && sourceMetadata.height === icon.size;
      await generateIcon(inputPath, outputPath, icon.size, sourceMetadata);
      successCount++;
      if (wasCopied) copiedCount++;
    } catch (error) {
      failCount++;
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log(`\n完成!`);
  console.log(`  成功: ${successCount} 个图标`);
  if (copiedCount > 0) {
    console.log(`  其中 ${copiedCount} 个直接使用原图（未处理）`);
  }
  console.log(`  失败: ${failCount} 个图标`);
  console.log(`  耗时: ${duration} 秒`);
  console.log(`  输出目录: ${outputDir}`);
  console.log(`\n✨ 所有图标已使用最高质量算法生成，保证最大程度不失真！`);
  
  // 生成Contents.json文件（用于Xcode）
  await generateContentsJson(outputDir);
}

/**
 * 生成Contents.json文件（Xcode需要的配置文件）
 */
async function generateContentsJson(outputDir) {
  const contents = {
    images: iOSIconSizes.map(icon => ({
      filename: icon.name,
      idiom: getIconIdiom(icon.name),
      scale: getIconScale(icon.name),
      size: getIconSize(icon.name)
    }))
  };

  const fs = await import('fs/promises');
  const contentsPath = join(outputDir, 'Contents.json');
  await fs.writeFile(contentsPath, JSON.stringify(contents, null, 2));
  console.log(`\n✓ 生成: ${contentsPath} (Xcode配置文件)`);
}

/**
 * 从文件名获取idiom
 */
function getIconIdiom(filename) {
  if (filename.includes('83.5')) return 'ipad';
  if (filename.includes('76')) return 'ipad';
  if (filename.includes('1024')) return 'ios-marketing';
  if (filename.includes('@1x')) return 'ipad';
  return 'iphone';
}

/**
 * 从文件名获取scale
 */
function getIconScale(filename) {
  if (filename.includes('@3x')) return '3x';
  if (filename.includes('@2x')) return '2x';
  return '1x';
}

/**
 * 从文件名获取size
 */
function getIconSize(filename) {
  const match = filename.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
  if (match) {
    return `${match[1]}x${match[2]}`;
  }
  return '20x20';
}

// 运行主函数
main().catch(error => {
  console.error('发生错误:', error);
  process.exit(1);
});

