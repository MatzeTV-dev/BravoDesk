-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               11.7.2-MariaDB - mariadb.org binary distribution
-- Server OS:                    Win64
-- HeidiSQL Version:             12.10.0.7000
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for customer_server_information_development
DROP DATABASE IF EXISTS `customer_server_information_development`;
CREATE DATABASE IF NOT EXISTS `customer_server_information_development` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;
USE `customer_server_information_development`;

-- Dumping structure for procedure customer_server_information_development.ActivateKey
DROP PROCEDURE IF EXISTS `ActivateKey`;
DELIMITER //
CREATE PROCEDURE `ActivateKey`(
	IN `input_key` VARCHAR(35),
	IN `discord_server_id` VARCHAR(35)
)
BEGIN
    DECLARE valid_days_var INT;

    -- valid_days aus der Tabelle activation_keys basierend auf dem input_key abrufen
    SELECT valid_days INTO valid_days_var
    FROM activation_keys
    WHERE activation_key = input_key;

    -- Insert in die server_activations-Tabelle mit dem abgerufenen valid_days-Wert
    INSERT INTO server_activations (activation_key, activation_date, sup_duration, discord_server_id)
    VALUES (input_key, CURDATE(), IFNULL(valid_days_var, 30), discord_server_id);
END//
DELIMITER ;

-- Dumping structure for table customer_server_information_development.activation_keys
DROP TABLE IF EXISTS `activation_keys`;
CREATE TABLE IF NOT EXISTS `activation_keys` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `activation_key` varchar(15) NOT NULL,
  `valid_days` int(3) DEFAULT 30,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=505 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for procedure customer_server_information_development.Add_User_To_Blacklist
DROP PROCEDURE IF EXISTS `Add_User_To_Blacklist`;
DELIMITER //
CREATE PROCEDURE `Add_User_To_Blacklist`(
  IN p_server_id VARCHAR(50),
  IN p_user_id VARCHAR(50),
  IN p_reason TEXT
)
BEGIN
  INSERT INTO ticket_blacklist (server_id, user_id, reason)
  VALUES (p_server_id, p_user_id, p_reason)
  ON DUPLICATE KEY UPDATE 
    reason = p_reason,
    created_at = CURRENT_TIMESTAMP;
END//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.CheckDiscordIDWithKey
DROP PROCEDURE IF EXISTS `CheckDiscordIDWithKey`;
DELIMITER //
CREATE PROCEDURE `CheckDiscordIDWithKey`(IN `input_key` VARCHAR(15), IN `input_discord_id` VARCHAR(35), OUT `is_match` BOOLEAN)
BEGIN
    DECLARE discord_id_in_db VARCHAR(35);

    -- Initialisiere die Rückgabevariable
    SET is_match = FALSE;

    -- Hole die Discord Server ID aus der server_activations Tabelle basierend auf dem Key
    SELECT discord_server_id INTO discord_id_in_db
    FROM server_activations
    WHERE activation_key = input_key
    LIMIT 1;

    -- Überprüfe, ob die Discord ID übereinstimmt
    IF discord_id_in_db = input_discord_id THEN
        SET is_match = TRUE;
    END IF;
END//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.CheckKeyActivated
DROP PROCEDURE IF EXISTS `CheckKeyActivated`;
DELIMITER //
CREATE PROCEDURE `CheckKeyActivated`(IN `input_key` VARCHAR(15), OUT `is_activated` BOOLEAN)
BEGIN
    DECLARE activation_count INT;

    -- Initialisiere den Rückgabewert
    SET is_activated = FALSE;

    -- Überprüfen, ob der Schlüssel in server_activations existiert
    SELECT COUNT(*) INTO activation_count
    FROM server_activations
    WHERE activation_key = input_key;

    IF activation_count > 0 THEN
        SET is_activated = TRUE;
    END IF;
END//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.CheckKeyExists
DROP PROCEDURE IF EXISTS `CheckKeyExists`;
DELIMITER //
CREATE PROCEDURE `CheckKeyExists`(IN `input_key` VARCHAR(15), OUT `exists_in_keys` BOOLEAN)
BEGIN
    DECLARE activation_count INT;

    -- Initialisiere den Rückgabewert
    SET exists_in_keys = FALSE;

    -- Überprüfen, ob der Schlüssel in activation_keys existiert
    SELECT COUNT(*) INTO activation_count
    FROM activation_keys
    WHERE activation_key = input_key;

    IF activation_count > 0 THEN
        SET exists_in_keys = TRUE;
    END IF;
END//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.CheckKeyValidity
DROP PROCEDURE IF EXISTS `CheckKeyValidity`;
DELIMITER //
CREATE PROCEDURE `CheckKeyValidity`(
	IN `in_input_key` VARCHAR(15),
	OUT `is_valid` INT
)
BEGIN
    DECLARE activation_dateTwo DATE;
    DECLARE expiry_date DATE;
    DECLARE duration_days INT;

    -- Initialisiere den Rückgabewert
    SET is_valid = 0;

    -- Hole die Dauer in Tagen
    SELECT CAST(sup_duration AS UNSIGNED)
    INTO duration_days
    FROM server_activations
    WHERE activation_key = in_input_key
    ORDER BY activation_date DESC
    LIMIT 1;

    -- Hole das Aktivierungsdatum für den gegebenen Schlüssel
    SELECT activation_date 
    INTO activation_dateTwo 
    FROM server_activations 
    WHERE activation_key = in_input_key
    ORDER BY activation_date DESC
    LIMIT 1;

    -- Überprüfe die Gültigkeit des Schlüssels
    IF activation_dateTwo IS NOT NULL THEN
        SET expiry_date = DATE_ADD(activation_dateTwo, INTERVAL duration_days DAY);
        IF CURDATE() <= expiry_date THEN
            SET is_valid = 1;
        ELSE
            SET is_valid = 0;
        END IF;
    ELSE
        SET is_valid = 0;
    END IF;
END//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.Check_If_Server_Exists
DROP PROCEDURE IF EXISTS `Check_If_Server_Exists`;
DELIMITER //
CREATE PROCEDURE `Check_If_Server_Exists`(IN `guild_id` VARCHAR(35), OUT `exists_flag` BOOLEAN)
IF (SELECT 1 FROM server_information WHERE discord_server_id = guild_id) THEN
        SET exists_flag = FALSE;
    ELSE
        SET exists_flag = TRUE;
END IF//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.Check_User_Blacklisted
DROP PROCEDURE IF EXISTS `Check_User_Blacklisted`;
DELIMITER //
CREATE PROCEDURE `Check_User_Blacklisted`(
  IN p_server_id VARCHAR(50),
  IN p_user_id VARCHAR(50),
  OUT p_is_blacklisted TINYINT
)
BEGIN
  SELECT COUNT(*) INTO p_is_blacklisted
  FROM ticket_blacklist
  WHERE server_id = p_server_id
    AND user_id = p_user_id;
  
  SET p_is_blacklisted = IF(p_is_blacklisted > 0, 1, 0);
END//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.CreateCategory
DROP PROCEDURE IF EXISTS `CreateCategory`;
DELIMITER //
CREATE PROCEDURE `CreateCategory`(
  IN IN_guild_id VARCHAR(255),
  IN IN_label VARCHAR(255),
  IN IN_description TEXT,
  IN IN_value VARCHAR(255),
  IN IN_emoji VARCHAR(50),
  IN IN_ai_prompt TEXT,
  IN IN_ai_enabled BOOLEAN,
  IN IN_permission TEXT
)
BEGIN
  INSERT INTO ticket_categories(guild_id, label, description, value, emoji, ai_prompt, ai_enabled, permission)
  VALUES (IN_guild_id, IN_label, IN_description, IN_value, IN_emoji, IN_ai_prompt, IN_ai_enabled, IN_permission);
END//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.DeleteCategory
DROP PROCEDURE IF EXISTS `DeleteCategory`;
DELIMITER //
CREATE PROCEDURE `DeleteCategory`(
  IN IN_guild_id VARCHAR(255),
  IN IN_label VARCHAR(255)
)
BEGIN
  DELETE FROM ticket_categories
  WHERE guild_id = IN_guild_id AND LOWER(label) = LOWER(IN_label);
END//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.Delete_Server_Information
DROP PROCEDURE IF EXISTS `Delete_Server_Information`;
DELIMITER //
CREATE PROCEDURE `Delete_Server_Information`(IN `guildID` VARCHAR(35))
DELETE FROM server_information WHERE discord_server_id = guildID//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.GetActivationKey
DROP PROCEDURE IF EXISTS `GetActivationKey`;
DELIMITER //
CREATE PROCEDURE `GetActivationKey`(
	IN `IN_discord_server_id` VARCHAR(35),
	OUT `OUT_activation_key` VARCHAR(35)
)
BEGIN
    SELECT activation_key
    INTO OUT_activation_key
    FROM server_activations
    WHERE discord_server_id = IN_discord_server_id
    LIMIT 1;
END//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.GetCategories
DROP PROCEDURE IF EXISTS `GetCategories`;
DELIMITER //
CREATE PROCEDURE `GetCategories`(
  IN IN_guild_id VARCHAR(255)
)
BEGIN
  SELECT label, description, value, emoji, ai_prompt AS aiPrompt, ai_enabled AS aiEnabled, permission
  FROM ticket_categories
  WHERE guild_id = IN_guild_id;
END//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.Get_Server_Information
DROP PROCEDURE IF EXISTS `Get_Server_Information`;
DELIMITER //
CREATE PROCEDURE `Get_Server_Information`(IN `discord_server_id_IN` VARCHAR(35))
SELECT * FROM server_information WHERE discord_server_id = discord_server_id_IN//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.Remove_User_From_Blacklist
DROP PROCEDURE IF EXISTS `Remove_User_From_Blacklist`;
DELIMITER //
CREATE PROCEDURE `Remove_User_From_Blacklist`(
  IN p_server_id VARCHAR(50),
  IN p_user_id VARCHAR(50)
)
BEGIN
  DELETE FROM ticket_blacklist
  WHERE server_id = p_server_id
    AND user_id = p_user_id;
END//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.Save_Server_Information
DROP PROCEDURE IF EXISTS `Save_Server_Information`;
DELIMITER //
CREATE PROCEDURE `Save_Server_Information`(
	IN `discord_server_id_IN` VARCHAR(35),
	IN `ticket_system_channel_id_IN` VARCHAR(35),
	IN `ticket_category_id_IN` VARCHAR(35),
	IN `support_role_id_IN` VARCHAR(35),
	IN `kiadmin_role_id_IN` VARCHAR(35),
	IN `ticket_archiv_category_id_IN` VARCHAR(35)
)
INSERT INTO server_information (discord_server_id, ticket_system_channel_id, ticket_category_id,support_role_id, kiadmin_role_id, ticket_archiv_category_id )
VALUES (discord_server_id_IN,ticket_system_channel_id_IN, ticket_category_id_IN, support_role_id_IN, 	kiadmin_role_id_IN, ticket_archiv_category_id_IN)//
DELIMITER ;

-- Dumping structure for table customer_server_information_development.server_activations
DROP TABLE IF EXISTS `server_activations`;
CREATE TABLE IF NOT EXISTS `server_activations` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `activation_key` varchar(15) NOT NULL,
  `activation_date` date NOT NULL,
  `sup_duration` varchar(3) NOT NULL,
  `discord_server_id` varchar(35) NOT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table customer_server_information_development.server_information
DROP TABLE IF EXISTS `server_information`;
CREATE TABLE IF NOT EXISTS `server_information` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `discord_server_id` varchar(35) NOT NULL,
  `ticket_system_channel_id` varchar(35) NOT NULL,
  `ticket_category_id` varchar(35) NOT NULL,
  `support_role_id` varchar(35) NOT NULL,
  `kiadmin_role_id` varchar(35) NOT NULL,
  `ticket_archiv_category_id` varchar(35) DEFAULT NULL,
  `hex_color` varchar(7) NOT NULL DEFAULT '#6B8F71',
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for procedure customer_server_information_development.sp_AddBlacklist
DROP PROCEDURE IF EXISTS `sp_AddBlacklist`;
DELIMITER //
CREATE PROCEDURE `sp_AddBlacklist`(
	IN `p_server_id` VARCHAR(35),
	IN `p_user_id` VARCHAR(35),
	IN `p_reason` TEXT
)
BEGIN
    INSERT INTO ticket_blacklist (server_id, user_id, reason, created_at)
    VALUES (p_server_id, p_user_id, p_reason, NOW());
END//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.sp_AddTicketCategory
DROP PROCEDURE IF EXISTS `sp_AddTicketCategory`;
DELIMITER //
CREATE PROCEDURE `sp_AddTicketCategory`(
	IN `p_guild_id` VARCHAR(35),
	IN `p_label` VARCHAR(255),
	IN `p_description` TEXT,
	IN `p_value` VARCHAR(255),
	IN `p_emoji` VARCHAR(16),
	IN `p_prompt` TEXT,
	IN `p_enabled` TINYINT,
	IN `p_permission` VARCHAR(50)
)
BEGIN
    INSERT INTO ticket_categories (guild_id, label, `description`, `value`, emoji, ai_prompt, ai_enabled, permission)
    VALUES (p_guild_id, p_label, p_description, p_value, p_emoji, p_prompt, p_enabled, p_permission);
END//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.sp_DeleteTicketCategory
DROP PROCEDURE IF EXISTS `sp_DeleteTicketCategory`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteTicketCategory`(
    IN p_id INT,
    IN p_guild_id VARCHAR(35)
)
BEGIN
    DELETE FROM ticket_categories
    WHERE id = p_id
      AND guild_id = p_guild_id;
END//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.sp_GetBlacklist
DROP PROCEDURE IF EXISTS `sp_GetBlacklist`;
DELIMITER //
CREATE PROCEDURE `sp_GetBlacklist`(
	IN `p_server_id` VARCHAR(35)
)
BEGIN
    SELECT *
    FROM ticket_blacklist
    WHERE server_id = p_server_id;
END//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.sp_GetTicketCategories
DROP PROCEDURE IF EXISTS `sp_GetTicketCategories`;
DELIMITER //
CREATE PROCEDURE `sp_GetTicketCategories`(
    IN p_guild_id VARCHAR(35)
)
BEGIN
    SELECT * 
    FROM ticket_categories
    WHERE guild_id = p_guild_id;
END//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.sp_RemoveBlacklist
DROP PROCEDURE IF EXISTS `sp_RemoveBlacklist`;
DELIMITER //
CREATE PROCEDURE `sp_RemoveBlacklist`(
	IN `p_server_id` VARCHAR(35),
	IN `p_user_id` VARCHAR(35)
)
BEGIN
    DELETE FROM ticket_blacklist
    WHERE server_id = p_server_id
      AND user_id   = p_user_id;
END//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.sp_SearchBlacklist
DROP PROCEDURE IF EXISTS `sp_SearchBlacklist`;
DELIMITER //
CREATE PROCEDURE `sp_SearchBlacklist`(
	IN `p_server_id` VARCHAR(35),
	IN `p_user_id` VARCHAR(35)
)
BEGIN
    SELECT *
    FROM ticket_blacklist
    WHERE server_id = p_server_id
      AND user_id   = p_user_id;
END//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.sp_UpdateTicketCategory
DROP PROCEDURE IF EXISTS `sp_UpdateTicketCategory`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateTicketCategory`(
	IN `p_id` INT,
	IN `p_guild_id` VARCHAR(35),
	IN `p_label` VARCHAR(255),
	IN `p_description` TEXT,
	IN `p_emoji` VARCHAR(16),
	IN `p_prompt` TEXT,
	IN `p_enabled` TINYINT,
	IN `p_permission` CHAR(50)
)
BEGIN
    UPDATE ticket_categories
    SET
        label       = p_label,
        description = p_description,
        emoji       = p_emoji,
        ai_prompt   = p_prompt,
        ai_enabled  = p_enabled,
        permission  = p_permission
    WHERE id = p_id
      AND guild_id = p_guild_id;
END//
DELIMITER ;

-- Dumping structure for table customer_server_information_development.ticket_blacklist
DROP TABLE IF EXISTS `ticket_blacklist`;
CREATE TABLE IF NOT EXISTS `ticket_blacklist` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `server_id` varchar(35) NOT NULL,
  `user_id` varchar(35) NOT NULL,
  `reason` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_entry` (`server_id`,`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table customer_server_information_development.ticket_categories
DROP TABLE IF EXISTS `ticket_categories`;
CREATE TABLE IF NOT EXISTS `ticket_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `guild_id` varchar(35) NOT NULL,
  `label` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `value` varchar(255) DEFAULT NULL,
  `emoji` varchar(50) DEFAULT NULL,
  `ai_prompt` text DEFAULT NULL,
  `ai_enabled` tinyint(1) DEFAULT NULL,
  `permission` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
