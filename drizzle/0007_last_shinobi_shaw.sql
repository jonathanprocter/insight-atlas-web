CREATE TABLE `error_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`error_type` varchar(100) NOT NULL,
	`error_message` text NOT NULL,
	`error_stack` longtext,
	`request_path` varchar(500),
	`request_input` longtext,
	`userId` int,
	`insightId` int,
	`bookId` int,
	`user_agent` text,
	`ip_address` varchar(45),
	CONSTRAINT `error_logs_id` PRIMARY KEY(`id`)
);
