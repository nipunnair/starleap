import {test,expect} from '@playwright/test';
test('legal moves that miss the lesson do not advance any stage',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Tutorial',exact:true}).click();
 for(const stage of [{text:'neighboring',wrong:'0,-1,1',goal:'1,-1,0'},{text:'long jump',wrong:'1,-1,0',goal:'4,-4,0'},{text:'two-hop chain',wrong:'2,-2,0',goal:'4,-4,0'},{text:'target corner',wrong:'-2,1,1',goal:'-5,3,2'}]){
 await expect(page.getByTestId('tutorial-instruction')).toContainText(stage.text);
 await page.getByTestId('peg-tutorial-peg').click();await page.getByTestId(`cell-${stage.wrong}`).click();
 await expect(page.getByRole('status')).toContainText('That move is legal');await expect(page.getByTestId('tutorial-instruction')).toContainText(stage.text);
 await page.getByTestId(`cell-${stage.goal}`).click();
 }
 await expect(page.getByText('Tutorial complete')).toBeVisible();
});
