// js/tailwind.config.js
const tailwindConfig = {
    theme: {
        extend: {
            colors: {
                'kfupm': {
                    50: '#f0fdf4',
                    100: '#dcfce7',
                    200: '#bbf7d0',
                    300: '#86efac',
                    400: '#4ade80',
                    500: '#006B3F',  // KFUPM primary green
                    600: '#005a35',  // Darker shade for hover
                    700: '#004a2b',  // Even darker for active states
                    800: '#003920',
                    900: '#002915'
                }
            }
        }
    }
};

export default tailwindConfig;