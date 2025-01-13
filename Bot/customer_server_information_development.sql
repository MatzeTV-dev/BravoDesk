-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               11.6.2-MariaDB - mariadb.org binary distribution
-- Server OS:                    Win64
-- HeidiSQL Version:             12.8.0.6908
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
CREATE DATABASE IF NOT EXISTS `customer_server_information_development` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;
USE `customer_server_information_development`;

-- Dumping structure for procedure customer_server_information_development.ActivateKey
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
CREATE TABLE IF NOT EXISTS `activation_keys` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `activation_key` varchar(15) NOT NULL,
  `valid_days` int(3) DEFAULT 30,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=505 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for procedure customer_server_information_development.CheckDiscordIDWithKey
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
DELIMITER //
CREATE PROCEDURE `Check_If_Server_Exists`(IN `guild_id` VARCHAR(35), OUT `exists_flag` BOOLEAN)
IF (SELECT 1 FROM server_information WHERE discord_server_id = guild_id) THEN
        SET exists_flag = FALSE;
    ELSE
        SET exists_flag = TRUE;
END IF//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.Delete_Server_Information
DELIMITER //
CREATE PROCEDURE `Delete_Server_Information`(IN `guildID` VARCHAR(35))
DELETE FROM server_information WHERE discord_server_id = guildID//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.Get_Server_Information
DELIMITER //
CREATE PROCEDURE `Get_Server_Information`(IN `discord_server_id_IN` VARCHAR(35))
SELECT * FROM server_information WHERE discord_server_id = discord_server_id_IN//
DELIMITER ;

-- Dumping structure for procedure customer_server_information_development.Save_Server_Information
DELIMITER //
CREATE PROCEDURE `Save_Server_Information`(IN `discord_server_id_IN` VARCHAR(35), IN `ticket_system_channel_id_IN` VARCHAR(35), IN `ticket_category_id_IN` VARCHAR(35), IN `support_role_id_IN` VARCHAR(35), IN `kiadmin_role_id_IN` VARCHAR(35))
INSERT INTO server_information (discord_server_id, ticket_system_channel_id, ticket_category_id,support_role_id,  	kiadmin_role_id )
VALUES (discord_server_id_IN,ticket_system_channel_id_IN, ticket_category_id_IN, support_role_id_IN, 	kiadmin_role_id_IN)//
DELIMITER ;

-- Dumping structure for table customer_server_information_development.server_activations
CREATE TABLE IF NOT EXISTS `server_activations` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `activation_key` varchar(15) NOT NULL,
  `activation_date` date NOT NULL,
  `sup_duration` varchar(3) NOT NULL,
  `discord_server_id` varchar(35) NOT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

-- Dumping structure for table customer_server_information_development.server_information
CREATE TABLE IF NOT EXISTS `server_information` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `discord_server_id` varchar(35) NOT NULL,
  `ticket_system_channel_id` varchar(35) NOT NULL,
  `ticket_category_id` varchar(35) NOT NULL,
  `support_role_id` varchar(35) NOT NULL,
  `kiadmin_role_id` varchar(35) NOT NULL,
  `hex_color` varchar(7) NOT NULL DEFAULT '#6B8F71',
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data exporting was unselected.

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
