ALTER TABLE `books` ADD CONSTRAINT `books_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `insights` ADD CONSTRAINT `insights_bookId_books_id_fk` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `insights` ADD CONSTRAINT `insights_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `library_items` ADD CONSTRAINT `library_items_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `library_items` ADD CONSTRAINT `library_items_bookId_books_id_fk` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `library_items` ADD CONSTRAINT `library_items_insightId_insights_id_fk` FOREIGN KEY (`insightId`) REFERENCES `insights`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `books_userId_idx` ON `books` (`userId`);--> statement-breakpoint
CREATE INDEX `insights_bookId_idx` ON `insights` (`bookId`);--> statement-breakpoint
CREATE INDEX `insights_userId_idx` ON `insights` (`userId`);--> statement-breakpoint
CREATE INDEX `libraryItems_userId_idx` ON `library_items` (`userId`);--> statement-breakpoint
CREATE INDEX `libraryItems_bookId_idx` ON `library_items` (`bookId`);