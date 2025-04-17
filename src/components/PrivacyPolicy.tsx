import React from 'react';
import { Container, Typography, Box } from '@mui/material';

export function PrivacyPolicy() {
  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Политика конфиденциальности
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 2 }}>
          Последнее обновление: {new Date().toLocaleDateString()}
        </Typography>

        <Typography variant="h6" gutterBottom>
          1. Сбор информации
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Мы собираем информацию, которую вы предоставляете при использовании нашего приложения, включая:
        </Typography>
        <Typography component="div" variant="body1" sx={{ mb: 2 }}>
          <Box component="ul" sx={{ pl: 4 }}>
            <Box component="li">Данные для входа в Google</Box>
            <Box component="li">Информацию из Google Таблиц, к которым вы предоставляете доступ</Box>
            <Box component="li">Данные о вашем устройстве и браузере</Box>
          </Box>
        </Typography>

        <Typography variant="h6" gutterBottom>
          2. Использование информации
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Собранная информация используется для:
          <Box component="ul" sx={{ pl: 4 }}>
            <Box component="li">Предоставления доступа к функционалу приложения</Box>
            <Box component="li">Улучшения работы приложения</Box>
            <Box component="li">Обеспечения безопасности</Box>
            <Box component="li">Технической поддержки</Box>
          </Box>
        </Typography>

        <Typography variant="h6" gutterBottom>
          3. Защита данных
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Мы принимаем меры для защиты ваших данных:
          <Box component="ul" sx={{ pl: 4 }}>
            <Box component="li">Используем шифрование при передаче данных</Box>
            <Box component="li">Ограничиваем доступ к данным</Box>
            <Box component="li">Регулярно обновляем системы безопасности</Box>
          </Box>
        </Typography>

        <Typography variant="h6" gutterBottom>
          4. Cookies
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Мы используем cookies для:
          <Box component="ul" sx={{ pl: 4 }}>
            <Box component="li">Сохранения настроек пользователя</Box>
            <Box component="li">Аналитики использования приложения</Box>
            <Box component="li">Улучшения производительности</Box>
          </Box>
        </Typography>

        <Typography variant="h6" gutterBottom>
          5. Права пользователей
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Вы имеете право:
          <Box component="ul" sx={{ pl: 4 }}>
            <Box component="li">Запросить доступ к вашим данным</Box>
            <Box component="li">Запросить исправление данных</Box>
            <Box component="li">Запросить удаление данных</Box>
            <Box component="li">Отозвать согласие на обработку данных</Box>
          </Box>
        </Typography>

        <Typography variant="h6" gutterBottom>
          6. Контактная информация
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          По всем вопросам, связанным с обработкой персональных данных, вы можете обратиться по адресу: i.a.domashnikh@urfu.ru
        </Typography>
      </Box>
    </Container>
  );
}
