CREATE TABLE `chapters` (
	`id` text PRIMARY KEY NOT NULL,
	`estimate_id` text NOT NULL,
	`title` text NOT NULL,
	`order` integer NOT NULL,
	FOREIGN KEY (`estimate_id`) REFERENCES `estimates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`phone` text,
	`email` text NOT NULL,
	`tax_id` text,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `estimates` (
	`id` text PRIMARY KEY NOT NULL,
	`estimate_number` text NOT NULL,
	`year` integer NOT NULL,
	`customer_id` text NOT NULL,
	`subject` text NOT NULL,
	`site` text NOT NULL,
	`creation_date` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`tax_rate` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `estimates_estimate_number_unique` ON `estimates` (`estimate_number`);--> statement-breakpoint
CREATE TABLE `line_items` (
	`id` text PRIMARY KEY NOT NULL,
	`chapter_id` text NOT NULL,
	`code` text NOT NULL,
	`description` text NOT NULL,
	`unit` text NOT NULL,
	`quantity` real NOT NULL,
	`unit_price` real NOT NULL,
	`amount` real NOT NULL,
	`order` integer NOT NULL,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `standard_texts` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `standard_texts_key_unique` ON `standard_texts` (`key`);--> statement-breakpoint
CREATE TABLE `templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cover` text DEFAULT '{}' NOT NULL,
	`header` text DEFAULT '{}' NOT NULL,
	`footer` text DEFAULT '{}' NOT NULL,
	`typography` text DEFAULT '{}' NOT NULL,
	`spacing` text DEFAULT '{}' NOT NULL,
	`table_rules` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`postal_code` text NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`slogan` text
);
