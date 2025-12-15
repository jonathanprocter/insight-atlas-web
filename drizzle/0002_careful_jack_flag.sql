ALTER TABLE `books` ADD `extractedText` text;--> statement-breakpoint
ALTER TABLE `books` ADD `pageCount` int;--> statement-breakpoint
ALTER TABLE `content_blocks` ADD `visualType` varchar(50);--> statement-breakpoint
ALTER TABLE `content_blocks` ADD `visualData` text;--> statement-breakpoint
ALTER TABLE `content_blocks` ADD `listItems` text;--> statement-breakpoint
ALTER TABLE `insights` ADD `keyThemes` text;--> statement-breakpoint
ALTER TABLE `insights` ADD `audioScript` text;--> statement-breakpoint
ALTER TABLE `insights` ADD `audioDuration` int;--> statement-breakpoint
ALTER TABLE `insights` ADD `pdfUrl` text;--> statement-breakpoint
ALTER TABLE `insights` ADD `pdfKey` varchar(255);--> statement-breakpoint
ALTER TABLE `insights` ADD `recommendedVisuals` text;--> statement-breakpoint
ALTER TABLE `books` DROP COLUMN `textContent`;--> statement-breakpoint
ALTER TABLE `content_blocks` DROP COLUMN `metadata`;--> statement-breakpoint
ALTER TABLE `insights` DROP COLUMN `content`;--> statement-breakpoint
ALTER TABLE `insights` DROP COLUMN `visualType`;--> statement-breakpoint
ALTER TABLE `insights` DROP COLUMN `visualData`;