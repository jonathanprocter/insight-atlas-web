CREATE TABLE `books` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`author` varchar(255),
	`fileUrl` text,
	`fileKey` varchar(255),
	`fileType` varchar(20),
	`textContent` text,
	`wordCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `books_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`insightId` int NOT NULL,
	`blockType` varchar(50) NOT NULL,
	`title` varchar(255),
	`content` text,
	`metadata` json,
	`orderIndex` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `content_blocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `insights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text,
	`summary` text,
	`visualType` varchar(50),
	`visualData` json,
	`audioUrl` text,
	`audioKey` varchar(255),
	`status` enum('pending','generating','completed','failed') NOT NULL DEFAULT 'pending',
	`wordCount` int DEFAULT 0,
	`generationProgress` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `insights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `library_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bookId` int NOT NULL,
	`insightId` int,
	`isFavorite` boolean NOT NULL DEFAULT false,
	`readingStatus` enum('new','reading','completed') NOT NULL DEFAULT 'new',
	`lastAccessedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `library_items_id` PRIMARY KEY(`id`)
);
